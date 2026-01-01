import { Controller, Post } from "@nestjs/common";
import { BrokerResult, BrokerService } from "./broker.service";

@Controller('broker')
export class BrokerController {
    constructor(private readonly brokerService: BrokerService) { }

    @Post('fetch')
    async fetchBroker(): Promise<BrokerResult> {
        return this.brokerService.fetchAndSaveBrokers();
    }
}
