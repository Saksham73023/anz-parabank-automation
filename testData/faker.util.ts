import { faker } from '@faker-js/faker';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RegistrationData } from '../pages/registration.page';

interface ParaBankTestData {
    login: {
        username: string;
        password: string;
    };
    registrations: RegistrationData[];
}

const testDataPath = join(__dirname, 'parabank.test.json');

function readTestData(): ParaBankTestData {
    return JSON.parse(readFileSync(testDataPath, 'utf8')) as ParaBankTestData;
}

export function getLoginCredentials(): ParaBankTestData['login'] {
    return readTestData().login;
}

export function createRegistrationData(): RegistrationData {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const usernameName = firstName.replace(/[^a-zA-Z]/g, '').toLowerCase();

    const registrationData = {
        firstName,
        lastName,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode('#####'),
        phoneNumber: faker.string.numeric(10),
        ssn: faker.string.numeric(9),
        username: `${usernameName}${faker.string.numeric(3)}`,
        password: faker.string.numeric(8)
    };

    const testData = readTestData();
    testData.registrations.push(registrationData);
    writeFileSync(testDataPath, `${JSON.stringify(testData, null, 2)}\n`, 'utf8');

    return registrationData;
}