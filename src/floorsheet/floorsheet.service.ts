import {
  Injectable,
  InternalServerErrorException,
  Inject,
  ConflictException,
} from '@nestjs/common';
import { chromium, Page } from 'playwright';
import * as fs from 'fs';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema/floorsheet';
import { eq, inArray, sql } from 'drizzle-orm';
import { parse } from 'node-xlsx';
import {
  NepseAuthContext,
  NepseAuthService,
} from 'src/nepseAuth/nepseAuth.service';
import { Observable, Subject } from 'rxjs';
import { CompanyService } from 'src/company/company.service';
import { BrokerService } from 'src/broker/broker.service';

export interface FloorsheetAuthContext {
  authToken: string;
  initialId: number;
}

export interface FloorsheetResult {
  totalTrades: number;
}

export interface Floorsheet {
  contractId: number;
  stockSymbol: string;
  contractQuantity: number;
  contractRate: number;
  contractAmount: number;
  buyerMemberId: number;
  sellerMemberId: number;
  businessDate: string;
  tradeTime?: string;
}

export interface SaveFloorsheetCsvResult {
  insertedTrades: number;
}

export interface UniqueCompaniesInFloorsheet {
  stockSymbol: string;
  companyName: string;
  totalQuantity: number;
  averageRate: number;
  averageAmount: number;
}

export interface UniqueCompaniesInFloorsheetResult {
  data: UniqueCompaniesInFloorsheet[];
  total: number;
}

export interface ProgressUpdate {
  data: {
    current: number;
    total: number;
    percentage: number;
    message: string;
  };
  // Optional SSE fields
  id?: string;
  type?: string;
  retry?: number;
}

@Injectable()
export class FloorsheetService {
  private keys;
  private progressSubject = new Subject<ProgressUpdate>();
  private isProcessing = false;
  constructor(
    @Inject('DB') private db: NodePgDatabase<typeof schema>,
    private readonly nepseAuthService: NepseAuthService,
    private readonly companyService: CompanyService,
    private readonly brokerService: BrokerService,
  ) {
    this.keys = [
      'sn',
      'contractId',
      'stockSymbol',
      'buyerId',
      'sellerId',
      'quantity',
      'rate',
      'amount',
      'businessDate',
    ];
  }

  // 2. Helper to expose the subject as an Observable for the controller
  getProgressStream(): Observable<ProgressUpdate> {
    return this.progressSubject.asObservable();
  }

  // 3. Helper to emit progress
  private emitProgress(current: number, total: number, message: string) {
    this.progressSubject.next({
      data: {
        current,
        total,
        percentage: Math.round((current / total) * 100),
        message,
      },
    });
  }

  async fetchAndSaveFloorsheet(): Promise<FloorsheetResult> {
    if (this.isProcessing) {
      throw new ConflictException(
        'A floorsheet sync is already in progress. Please wait for it to complete.',
      );
    }

    this.isProcessing = true;
    const allTrades: any[] = [];

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
    });
    const page = await context.newPage();

    console.log('Fetching floorsheet...');

    try {
      const authContext = await this.nepseAuthService.getCredentials(page);

      console.log('Authenticated');

      const firstPageData = await this.fetchFirstPage(page, authContext);

      if (
        !firstPageData ||
        !firstPageData.floorsheets ||
        !firstPageData.floorsheets.content ||
        !firstPageData.floorsheets.content.length
      ) {
        throw new InternalServerErrorException('No floorsheet data returned');
      }

      const firstContent = firstPageData.floorsheets.content[0];

      if (!firstContent.buyerMemberId) {
        throw new InternalServerErrorException(
          'Floorsheet not updated. Please try again after market closes.',
        );
      }

      // Add first page data to allTrades
      const firstPageCount = firstPageData.floorsheets.content.length;

      const pageSize = 500;
      const totalTrades = firstPageData.totalTrades;
      const totalPages = Math.ceil(totalTrades / pageSize);

      console.log(
        `✓ Fetched page 1: ${firstPageCount} records, total trades: ${totalTrades}, total pages: ${totalPages}`,
      );

      this.emitProgress(0, totalTrades, 'Starting fetch...');
      let processedTrades = 0;

      await this.fetchRemainingPages(
        page,
        authContext,
        pageSize,
        totalPages,
        allTrades,
        totalTrades,
        (count) => {
          processedTrades += count;
          this.emitProgress(
            processedTrades,
            totalTrades,
            `Inserted ${processedTrades} trades`,
          );
        },
      );

      await browser.close();

      this.isProcessing = false;

      return { totalTrades: allTrades.length };
    } catch (error) {
      this.isProcessing = false;
      console.error('Floorsheet fetch failed', error);
      await browser.close();
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to fetch floorsheet data');
    }
  }

  async initializeAndAuthenticate(page: Page): Promise<FloorsheetAuthContext> {
    let authToken: string | null = null;
    let initialId: number | null = null;

    // Capture NEPSE's floorsheet request
    page.on('request', (req) => {
      if (
        req.url().includes('/api/nots/nepse-data/floorsheet') &&
        req.headers()['authorization']
      ) {
        authToken = req.headers()['authorization'];

        const postData = req.postData();
        if (postData) {
          try {
            const body = JSON.parse(postData);
            if (body.id !== undefined) {
              initialId = body.id;
            }
          } catch {
            // ignore parse error
          }
        }
      }
    });

    // Retry logic for page navigation
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await page.goto('https://nepalstock.com.np/floor-sheet', {
          waitUntil: 'networkidle',
          timeout: 60000, // 60 seconds timeout
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;
        console.log(
          `Page navigation attempt ${attempt}/${maxRetries} failed:`,
          lastError.message,
        );
        if (attempt < maxRetries) {
          await page.waitForTimeout(2000 * attempt); // Exponential backoff
        }
      }
    }

    if (lastError && !authToken) {
      throw new InternalServerErrorException(
        `Failed to navigate to floorsheet page after ${maxRetries} attempts: ${lastError.message}`,
      );
    }

    await page.evaluate(async () => {
      await fetch('https://nepalstock.com.np/api/authenticate/prove', {
        method: 'POST',
        credentials: 'include',
      });
    });
    await page.waitForTimeout(1500);

    if (!authToken || initialId === null) {
      throw new InternalServerErrorException(
        'Authorization token or initial id not captured',
      );
    }

    return {
      authToken,
      initialId,
    };
  }

  private async fetchFirstPage(
    page: Page,
    context: NepseAuthContext,
  ): Promise<any> {
    const firstPageData: any = await page.evaluate(
      async ({ token, lastId }) => {
        const res = await fetch(
          'https://nepalstock.com.np/api/nots/nepse-data/floorsheet?page=1&size=500&sort=contractId,desc',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: token,
            },
            body: JSON.stringify({ id: lastId }),
          },
        );

        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return { error: 'Not JSON', raw: text };
        }
      },
      { token: context.token, lastId: context.id },
    );

    return firstPageData;
  }

  private async fetchRemainingPages(
    page: Page,
    context: NepseAuthContext,
    pageSize: number,
    totalPages: number,
    allTrades: any[],
    totalTrades: number,
    onProgress: (insertedCount: number) => void,
  ): Promise<void> {
    let authToken = context.token;
    let currentInitialId = context.id;

    console.log('Starting fetchRemainingPages');
    console.log('Initial authToken:', authToken?.substring(0, 20) + '...');
    console.log('Initial initialId:', currentInitialId);

    // First page is already fetched separately; start from page 2
    for (let pageNumber = 0; pageNumber < totalPages; pageNumber++) {
      let pageData: any;
      let requestSuccessful = false;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(
            `Fetching page ${pageNumber + 1}, attempt ${attempt}/3, using initialId: ${currentInitialId}`,
          );

          pageData = await page.evaluate(
            async ({ token, pageSize: size, pageNumber, lastId }) => {
              const res = await fetch(
                `https://nepalstock.com.np/api/nots/nepse-data/floorsheet?page=${pageNumber}&size=${size}&sort=contractId,desc`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: token,
                  },
                  body: JSON.stringify({ id: lastId }),
                },
              );

              const text = await res.text();
              if (text.startsWith('<')) {
                return { expired: true };
              }

              try {
                const parsed = JSON.parse(text);
                // Check if response has empty content array
                if (
                  parsed.floorsheets &&
                  Array.isArray(parsed.floorsheets.content) &&
                  parsed.floorsheets.content.length === 0
                ) {
                  return { empty: true, data: parsed };
                }
                return parsed;
              } catch (parseError) {
                return { error: 'Parse error', raw: text.substring(0, 200) };
              }
            },
            {
              token: authToken,
              pageSize,
              pageNumber,
              lastId: currentInitialId,
            },
          );

          if (pageData?.expired) {
            console.log('Token expired, refreshing...');
            const refreshResult =
              await this.nepseAuthService.refreshCredentials(page);
            authToken = refreshResult.token;
            currentInitialId = refreshResult.id;

            console.log('Token refreshed successfully');
            console.log('New authToken:', authToken?.substring(0, 20) + '...');
            console.log('New initialId:', currentInitialId);

            // Wait a bit before retrying with new token
            await page.waitForTimeout(1000);
            continue; // Retry the request with new token
          }

          if (pageData?.empty) {
            console.warn(
              `Page ${pageNumber + 1} returned empty array. Response:`,
              JSON.stringify(pageData.data).substring(0, 200),
            );
            // Still mark as successful to avoid infinite retries
            requestSuccessful = true;
            break;
          }

          if (pageData?.error) {
            console.error(
              `Error parsing response for page ${pageNumber + 1}:`,
              pageData.error,
              pageData.raw,
            );
            if (attempt < 3) {
              await page.waitForTimeout(1000);
              continue;
            }
          }

          // Success - break out of retry loop
          requestSuccessful = true;
          break;
        } catch (error) {
          console.error(
            `Error fetching page ${pageNumber + 1}, attempt ${attempt}:`,
            error,
          );
          if (attempt < 3) {
            await page.waitForTimeout(1000 * attempt);
          }
        }
      }

      if (!requestSuccessful) {
        console.error(
          `Failed to fetch page ${pageNumber + 1} after 3 attempts`,
        );
        continue; // Skip this page and continue
      }

      if (
        pageData &&
        pageData.floorsheets &&
        Array.isArray(pageData.floorsheets.content) &&
        pageData.floorsheets.content.length > 0
      ) {
        const pageCount = pageData.floorsheets.content.length;
        const batch = pageData.floorsheets.content;

        allTrades.push(...pageData.floorsheets.content);

        // Insert data into database if it doesn't exist
        await this.insertFloorsheetDataIfNotExists(
          pageData.floorsheets.content,
        );

        onProgress(batch.length);

        console.log(
          `✓ Fetched page ${pageNumber + 1}: ${pageCount} records, running total: ${allTrades.length}/${totalTrades}`,
        );
      } else {
        console.warn(
          `⚠ Page ${pageNumber + 1} returned no data or empty array. Response structure:`,
          pageData ? Object.keys(pageData) : 'null',
        );
        if (pageData?.floorsheets) {
          console.warn(
            `  Content array length: ${pageData.floorsheets.content?.length || 0}`,
          );
        }
        console.log(
          `  Running total remains: ${allTrades.length}/${totalTrades}`,
        );
      }

      await page.waitForTimeout(500);
    }
  }

  private async insertFloorsheetDataIfNotExists(trades: any[]): Promise<void> {
    if (trades.length === 0) {
      return;
    }

    try {
      // Prepare data for insertion - map API response to database schema
      const insertData = trades.map((trade) => ({
        contractId: Number(trade.contractId),
        stockSymbol: trade.stockSymbol || '',
        contractQuantity: Number(trade.contractQuantity),
        contractRate: trade.contractRate?.toString() || '0',
        contractAmount: trade.contractAmount?.toString() || '0',
        buyerMemberId: trade.buyerMemberId || 0,
        sellerMemberId: trade.sellerMemberId || 0,
        businessDate:
          trade.businessDate || new Date().toISOString().slice(0, 10),
        tradeTime: trade.tradeTime ? new Date(trade.tradeTime) : null,
      }));

      // Filter out records that already exist by checking contractId
      const contractIds = insertData.map((d) => d.contractId);

      // Check which contractIds already exist in the database
      const existingContractIds = new Set(
        contractIds.length === 1
          ? (
              await this.db
                .select({ contractId: schema.floorsheet.contractId })
                .from(schema.floorsheet)
                .where(eq(schema.floorsheet.contractId, contractIds[0]))
            ).map((r) => r.contractId)
          : (
              await this.db
                .select({ contractId: schema.floorsheet.contractId })
                .from(schema.floorsheet)
                .where(inArray(schema.floorsheet.contractId, contractIds))
            ).map((r) => r.contractId),
      );

      // Filter to only insert records that don't exist
      const newRecords = insertData.filter(
        (record) => !existingContractIds.has(record.contractId),
      );

      if (newRecords.length === 0) {
        console.log(
          `  All ${insertData.length} records already exist in database`,
        );
        return;
      }

      // Insert in batches of 1000 for better performance
      const batchSize = 1000;
      for (let i = 0; i < newRecords.length; i += batchSize) {
        const batch = newRecords.slice(i, i + batchSize);
        await this.db.insert(schema.floorsheet).values(batch);
        console.log(
          `  Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} new records (${insertData.length - newRecords.length} already existed)`,
        );
      }
    } catch (error) {
      console.error('Error inserting floorsheet data:', error);

      if (error?.cause?.constraint) {
        // Add companies and brokers if they do not exist

        const constraint = error.cause.constraint;

        if (constraint === 'floorsheet_stock_symbol_fk') {
          await this.companyService.fetchAndSaveCompanies();
          this.insertFloorsheetDataIfNotExists(trades);
        } else if (
          constraint === 'buyer_member_id_fk' ||
          constraint === 'floorsheet_seller_member_id_fk'
        ) {
          await this.brokerService.fetchAndSaveBrokers();
          this.insertFloorsheetDataIfNotExists(trades);
        }
      }
    }
  }

  private buildCsvContent(allTrades: any[]): string {
    const header =
      'contractId,stockSymbol,contractQuantity,contractRate,contractAmount,buyerMemberId,sellerMemberId,buyerBrokerName,sellerBrokerName,businessDate,tradeTime,securityName';

    const csvRows = allTrades.map((r) =>
      [
        r.contractId,
        r.stockSymbol,
        r.contractQuantity,
        r.contractRate,
        r.contractAmount,
        r.buyerMemberId,
        r.sellerMemberId,
        r.buyerBrokerName,
        r.sellerBrokerName,
        r.businessDate,
        r.tradeTime,
        r.securityName,
      ].join(','),
    );

    return header + '\n' + csvRows.join('\n');
  }

  private saveCsvToDatedFile(csvContent: string, dateString: string): string {
    // YYYY-MM-DD
    const filePath = `${dateString}.csv`;

    fs.writeFileSync(filePath, csvContent);

    return filePath;
  }

  public async saveFloorSheetFromCsv(xlsxFile: Express.Multer.File) {
    return this.readFloorSheet(xlsxFile);
  }

  private async readFloorSheet(
    xlsxFile: Express.Multer.File,
  ): Promise<SaveFloorsheetCsvResult> {
    console.log(`loading file ${xlsxFile.originalname}`);

    const fileResponse = parse(xlsxFile.buffer);

    console.log(fileResponse.length);

    const trades: Floorsheet[] = [];

    for (const sheet of fileResponse) {
      console.log(`Inserting ${sheet.name}`);
      const parsedTransactions = this.getDataFromSheet(
        sheet,
        xlsxFile.originalname,
      );

      trades.push(...parsedTransactions);

      console.log(`Pushed ${parsedTransactions.length} trades`);
    }

    await this.insertFloorsheetDataIfNotExists(trades);

    return { insertedTrades: trades.length };
  }

  private getDataFromSheet(sheet, location) {
    const data = sheet.data.slice(1);

    const parsedTransactions: Floorsheet[] = [];

    // extract the part after "_"
    const dateStr = location.split('_')[1]; // "20251217"

    // parse year, month, day
    const year = Number(dateStr.slice(0, 4));
    const month = Number(dateStr.slice(4, 6)) - 1; // JS months are 0-based
    const day = Number(dateStr.slice(6, 8));

    // create Date object
    const businessDate = new Date(year, month, day).toLocaleDateString();

    data.map((transaction) => {
      const tempTransaction: any = {
        sn: 0,
        contractId: 0,
        stockSymbol: '',
        buyerId: 0,
        sellerId: 0,
        quantity: 0,
        rate: 0,
        amount: 0,
      };
      this.keys.forEach((key, index) => {
        tempTransaction[key] = transaction[index];
      });

      tempTransaction.businessDate = businessDate;

      const parsedTransaction: Floorsheet = {
        contractId: tempTransaction.contractId,
        stockSymbol: tempTransaction.stockSymbol,
        contractQuantity: tempTransaction.quantity,
        contractRate: tempTransaction.rate,
        contractAmount: tempTransaction.contractAmount,
        buyerMemberId: tempTransaction.buyerId,
        sellerMemberId: tempTransaction.sellerId,
        businessDate: tempTransaction.businessDate,
      };

      parsedTransactions.push(parsedTransaction);
    });

    return parsedTransactions;
  }

  private saveDataInCsv(trades: Floorsheet[]) {
    const header = this.keys.join(',');

    const csvRows = trades.map((r) =>
      [
        r.contractId,
        r.stockSymbol,
        r.buyerMemberId,
        r.sellerMemberId,
        r.contractQuantity,
        r.contractRate,
        r.contractAmount,
        r.businessDate,
      ].join(','),
    );

    fs.writeFileSync(
      `floorsheet-${Date.now()}.csv`,
      header + '\n' + csvRows.join('\n'),
    );

    console.log('Saved data to floorsheet.csv');
  }
  async getUniqueCompaniesInFloorsheet() {
    const query = sql`SELECT DISTINCT(f.stock_symbol) AS stock_symbol, ROUND(SUM(f.contract_quantity), 4) total_quantity, 
                      ROUND(AVG(f.contract_rate), 4) average_rate, ROUND(AVG(f.contract_amount), 4) average_amount,
                      c.company_name
                      FROM floorsheet f
                      INNER JOIN company c
                      ON f.stock_symbol = c.symbol
                      GROUP BY c.company_name, f.stock_symbol
                      ORDER BY f.stock_symbol`;

    const result = await this.db.execute(query);

    const parsedResult: UniqueCompaniesInFloorsheet[] = result.rows.map(
      (row) => {
        return {
          averageAmount: Number(row.average_amount),
          averageRate: Number(row.average_rate),
          companyName: row.company_name as string,
          stockSymbol: row.stock_symbol as string,
          totalQuantity: Number(row.total_quantity),
        };
      },
    );

    const response: UniqueCompaniesInFloorsheetResult = {
      data: parsedResult,
      total: result.rowCount || 0,
    };

    return response;
  }
  //   async getHoldingOfBroker() {
  //     const query = sql`SELECT DISTINCT(f.buyer_member_id) AS buyer, ROUND(SUM(f.contract_quantity), 4) total_quantity,
  // ROUND(AVG(f.contract_rate), 4) average_rate, ROUND(AVG(f.contract_amount), 4) average_amount
  // FROM floorsheet f
  // INNER JOIN company c
  // ON f.stock_symbol = c.symbol
  // GROUP BY f.buyer_member_id, f.stock_symbol
  // HAVING f.stock_symbol = 'ADBL'
  // ORDER BY total_quantity DESC`;
  //   }
}
