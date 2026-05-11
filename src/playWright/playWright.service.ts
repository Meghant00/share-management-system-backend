import { Injectable } from '@nestjs/common';
import { chromium } from 'playwright';

@Injectable()
export class PlayWrightService {
  public async initializeBrowserContext() {
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled'],
    });

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    return { browser, context, page };
  }
}
