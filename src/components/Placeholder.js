import React,{ PropTypes }from 'react';

function Placeholder({
    height,
}) {
    return (
        <div
            style={{
                height,
            }}
        >&nbsp;</div>
    );
}

Placeholder.propTypes = {
    height: PropTypes.string.isRequired,
};

Placeholder.defaultProps = {
    height: "0px",
};

export default Placeholder;
