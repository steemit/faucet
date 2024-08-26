import { jest } from '@jest/globals';

const findUserMockSave = jest.fn();
const findUserSuccessUnverified = jest.fn(async () => ({
  email_is_verified: false,
  async save() {
    findUserMockSave();
  },
}));
const findUserFail = jest.fn(async () => false);

const createUserMockSave = jest.fn();
const createUser = jest.fn(async (newUser) => ({
  ...newUser,
  async save() {
    createUserMockSave();
  },
}));

export default {
  findUserMockSave,
  findUserSuccessUnverified,
  findUserFail,
  findUser: findUserFail,
  createUserMockSave,
  createUser,
};
