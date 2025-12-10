import AxeBuilder from '@axe-core/playwright';
import { expect, test as base } from '@playwright/test';

type Fixtures = {
  makeAxeBuilder: () => AxeBuilder;
};

export const test = base.extend<Fixtures>({
  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }));
  },
});

export { expect };
