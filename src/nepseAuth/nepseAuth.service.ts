import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Page } from 'playwright';

export interface NepseAuthContext {
  token: string;
  id: number;
}

@Injectable()
export class NepseAuthService {
  private authToken: string | null = null;
  private initialId: number | null = null;

  async getCredentials(page: Page): Promise<NepseAuthContext> {
    return await this.refreshCredentials(page);
  }

  async refreshCredentials(page: Page): Promise<NepseAuthContext> {
    console.log('Refreshing credentials...');

    // 1. Wrap the event listener in a Promise so we can "await" the capture
    const capturePromise = new Promise<NepseAuthContext>((resolve, reject) => {
      const timeout = setTimeout(() => {
        page.off('request', requestHandler); // Clean up
        reject(new Error('Token capture timed out'));
      }, 30000);

      const requestHandler = (req) => {
        if (
          req.url().includes('/nots/nepse-data/floorsheet') &&
          req.headers()['authorization']
        ) {
          const token = req.headers()['authorization'];
          let id = 0;

          try {
            const postData = req.postData();

            if (postData) {
              const body = JSON.parse(postData);
              id = body.id ?? 0;
            }
          } catch (e) {
            /* ignore parse errors */
          }

          clearTimeout(timeout);
          page.off('request', requestHandler); // Important: Remove listener after success
          resolve({ token, id });
        }
      };

      page.on('request', requestHandler);
    });

    try {
      if (page.url().includes('nepalstock.com.np')) {
        await page.reload({ waitUntil: 'networkidle' });
      } else {
        await page.goto('https://nepalstock.com.np/floor-sheet', {
          waitUntil: 'networkidle',
        });
      }

      const result = await capturePromise;

      this.authToken = result.token;
      this.initialId = result.id;

      return result;
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to refresh token: ${error.message}`,
      );
    }
  }
}
