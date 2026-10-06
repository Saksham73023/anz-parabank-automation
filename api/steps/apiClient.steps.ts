import { Given } from '@cucumber/cucumber';
import { apiClientFor } from '../services/apiHelpers';
import type { ApiWorld } from '../support/world';

Given('API client is configured', function (this: ApiWorld) {
  apiClientFor(this);
});
