import * as React from 'react';

interface ErrorRootProps {
  breadcrumb?: string;
}

export default class ErrorRoot extends React.Component<ErrorRootProps, never> {
  render() {
    return (
      <React.Fragment>
        {this.props.children}
      </React.Fragment>
    );
  }
}
