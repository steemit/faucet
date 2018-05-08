const findUserMockSave = jest.fn();
const findUserSuccessUnverified = jest.fn(async () => ({
    email_is_verified: false,
    async save() {
        findUserMockSave();
    },
}));
const findUserFail = jest.fn(async () => false);

const createUserMockSave = jest.fn();
const createUser = jest.fn(async newUser => ({
    ...newUser,
    async save() {
        createUserMockSave();
    },
}));

module.exports = {
    ...jest.genMockFromModule('../database'),
    findUserMockSave,
    findUserSuccessUnverified,
    findUserFail,
    findUser: findUserFail,
    createUserMockSave,
    createUser,
};
