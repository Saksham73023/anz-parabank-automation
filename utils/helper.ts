import { join } from 'node:path';

export function getTestDataFilePath(fileName: string): string {
    return join(__dirname, '..', 'testData', fileName);
}