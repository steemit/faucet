import { Map, Set } from 'immutable'

import requestsReducer, * as requestsActions from './requests'

describe('requests reducer', () => {
    it('should provide an initial state', () => {
        expect(requestsReducer(undefined)).toEqual({
            byId: null,
            inProgress: Set(),
        })
    })

    it('should handle a REQUEST action', () => {
        const reduced = requestsReducer(undefined, requestsActions.request('123', {
            whatever: 'payload',
        }))

        expect(reduced.byId.get('123')).toEqual({
            id: '123',
            params: {
                whatever: 'payload',
            },
        })

        expect(reduced.inProgress).toEqual(Set(['123']))
    })
})