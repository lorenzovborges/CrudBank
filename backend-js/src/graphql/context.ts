import { AccountService } from '../modules/account/accountService';
import { BalanceService } from '../modules/balance/balanceService';
import { TransactionService } from '../modules/transaction/transactionService';

export interface GraphQLServices {
  accountService: AccountService;
  balanceService: BalanceService;
  transactionService: TransactionService;
}

export interface GraphQLContext {
  services: GraphQLServices;
}
