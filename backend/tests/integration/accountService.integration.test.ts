import { ObjectId } from 'mongodb';
import { DomainError } from '../../src/shared/errors/DomainError';
import { encodeGlobalId } from '../../src/shared/relay/globalIdCodec';
import { parseDecimalBalance } from '../../src/modules/account/accountService';
import { clearDatabase, startIntegrationApp, stopIntegrationApp, type IntegrationAppContext } from './testApp';
import { createAccount } from './helpers/graphqlHelpers';

let context: IntegrationAppContext;

beforeAll(async () => {
  context = await startIntegrationApp();
});

afterAll(async () => {
  await stopIntegrationApp(context);
});

beforeEach(async () => {
  await clearDatabase();
});

describe('AccountService integration', () => {
  it('rejects duplicate branch+number and invalid lookup ids', async () => {
    await createAccount(context.requester, 'Dup A', '52998224725', '0001', '12345-6', '10.00');

    await expect(
      context.app.services.accountService.createAccount('Dup B', '02306078106', '0001', '12345-6', '20.00'),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'CONFLICT' });

    await expect(context.app.services.accountService.findById('invalid-id')).rejects.toMatchObject<Partial<DomainError>>({
      code: 'NOT_FOUND',
    });

    const unknownId = new ObjectId().toHexString();
    await expect(context.app.services.accountService.findById(unknownId)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'NOT_FOUND',
    });
  });

  it('updates active accounts and blocks updates on inactive accounts', async () => {
    const accountId = await createAccount(context.requester, 'Update A', '39053344705', '0001', '20001-1', '50.00');
    const loaded = await context.app.services.accountService.getByGlobalId(accountId);
    expect(loaded.id).toBe(accountId);

    const updated = await context.app.services.accountService.updateAccount(accountId, '  Update A Name  ', null);
    expect(updated.ownerName).toBe('Update A Name');

    const noTextUpdate = await context.app.services.accountService.updateAccount(accountId, '   ', '   ');
    expect(noTextUpdate.ownerName).toBe('Update A Name');

    await context.app.services.accountService.deactivateAccount(accountId);

    await expect(
      context.app.services.accountService.updateAccount(accountId, 'Should Fail', '52998224725'),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'ACCOUNT_INACTIVE' });
  });

  it('validates account listing pagination/status/cursor and global id types', async () => {
    const accountId = await createAccount(context.requester, 'List A', '52998224725', '0001', '30001-1', '100.00');

    await expect(context.app.services.accountService.listAccounts(0, null, null)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    await expect(
      context.app.services.accountService.listAccounts(10, null, 'UNKNOWN_STATUS'),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'VALIDATION_ERROR' });

    const invalidCursor = Buffer.from(`${Date.now()}:invalid-object-id`, 'utf8').toString('base64url');
    await expect(
      context.app.services.accountService.listAccounts(10, invalidCursor, null),
    ).rejects.toMatchObject<Partial<DomainError>>({ code: 'NOT_FOUND' });

    const txGlobalId = encodeGlobalId('Transaction', new ObjectId().toHexString());
    await expect(context.app.services.accountService.findRawByGlobalId(txGlobalId)).rejects.toMatchObject<Partial<DomainError>>({
      code: 'VALIDATION_ERROR',
    });

    const accountDoc = await context.app.services.accountService.findRawByGlobalId(accountId);
    const same = await context.app.services.accountService.findByIds([accountDoc._id.toHexString()]);
    expect(same).toHaveLength(1);

    await expect(context.app.services.accountService.findByIds(['not-object-id'])).rejects.toMatchObject<Partial<DomainError>>({
      code: 'NOT_FOUND',
    });
  });

  it('exposes decimal parser helper and ensureAccountActive behavior', async () => {
    const parsed = parseDecimalBalance('12.34');
    expect(parsed.toFixed(2)).toBe('12.34');

    const accountId = await createAccount(context.requester, 'Active Guard', '02306078106', '0001', '40001-1', '10.00');
    const account = await context.app.services.accountService.findRawByGlobalId(accountId);

    await context.app.services.accountService.deactivateAccount(accountId);
    const inactive = await context.app.services.accountService.findRawByGlobalId(accountId);

    expect(() => context.app.services.accountService.ensureAccountActive(account)).not.toThrow();
    expect(() => context.app.services.accountService.ensureAccountActive(inactive)).toThrow('Account is inactive');
  });
});
