import usersReducer from './users'

describe('users reducer', () => {
    it('should provide an initial state', () => {
        expect(usersReducer(undefined)).toEqual({
            byId: {
                users: [],
                requestHadError: false,
                isFetching: false,
            }
        })
    })
})