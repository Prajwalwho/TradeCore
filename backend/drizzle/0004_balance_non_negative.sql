ALTER TABLE "accounts" ADD CONSTRAINT "accounts_balance_non_negative" CHECK ("balance" >= 0);-- Custom SQL migration file, put your code below! --
