import React from 'react';
import PropTypes from 'prop-types';
import { Map } from 'immutable';
import toJS from './to-js';

const MockComponent = props => <h1> Hello {props.name} </h1>;
MockComponent.propTypes = {
    name: PropTypes.string.isRequired,
};

const mockProps = {
    name: 'Foo',
};

const mockImmutableProps = Map({
    name: 'Foo',
});

describe('to-js', () => {
    test('to-js passes props object', () => {
        const received = toJS(MockComponent)(mockProps);
        const expected = <MockComponent name="Foo" />;
        expect(received).toEqual(expected);
    });
    test('to-js converts Immutable Map to object', () => {
        const received = toJS(MockComponent)(mockImmutableProps);
        const expected = (
            <MockComponent
                __altered={false}
                __hash={undefined}
                __ownerID={undefined}
                _root={{ entries: [['name', 'Foo']], ownerID: {} }}
                size={1}
            />
        );
        expect(received).toEqual(expected);
    });
});
