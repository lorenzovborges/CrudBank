import { AccountService } from '../account/accountService';

export class BalanceService {
  private readonly accountService: AccountService;

  constructor(accountService: AccountService) {
    this.accountService = accountService;
  }

  async availableBalance(accountGlobalId: string): Promise<string> {
    return this.accountService.getCurrentBalanceByGlobalId(accountGlobalId);
  }
}
