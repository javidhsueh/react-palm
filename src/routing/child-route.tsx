import * as React from 'react';

export default (props) => {

  const [
    {component: ChildComponent, params: routeParams},
    ...childRoutes
  ] = props.routes;

  return (
    <ChildComponent
      {...props}
      routeParams={routeParams}
      routes={childRoutes} />
  );

};
