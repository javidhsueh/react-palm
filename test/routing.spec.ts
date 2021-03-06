import test from 'ava';
import {createStore, applyMiddleware} from 'redux';

import {createRouter, uHelper, u} from '../src/routing';
import {handleActions} from '../src/actions';
import {drainTasksForTesting} from '../src/tasks';
import {HISTORY_PUSH_TASK, LocationTask} from '../src/history';

const IndexComponent = Symbol('index');
const PostComponent = Symbol('post');
const UserComponent = Symbol('user');
const ParagraphComponent = Symbol('para');

const ROUTES = {
  post: {url: u`/users/${{uid: Number}}/${{pid: String}}`, component: PostComponent, childRoutes: {
    paragraph: {url: u`/paragraph/${{paragraph: Number}}/${{word: Number}}`, component: ParagraphComponent},
    chat: {url: u`/chat/${{cid: Number}}`, redirectTo: (routes, params) => routes.index()}
  }},
  user: {url: u`/users/${{uid: Number}}`, component: UserComponent},
  index: {url: u`/`, component: IndexComponent}
};

test('uHelper should return the formatted string', t => {
  t.is(uHelper`/users/${{uid: Number}}`, '/users/:uid');
});

test('u should serialize and deserialize correctly params', t => {

  const res = u`/users/${{uid: Number}}`;

  t.deepEqual(res.deserialize('/users/123').params, {uid: '123'});
  t.is(res.serialize({uid: '123'}), '/users/123');

});

test('createRouter should generate urls', t => {

  const {routes} = createRouter(ROUTES);
  t.is(routes.user({uid: '123'}), '/users/123');

});

test('createRouter should generate urls with child routes', t => {

  const {routes} = createRouter(ROUTES);

  t.is(routes.post({uid: 123, pid: 2})(), '/users/123/2');
  t.is(routes.post({uid: 123, pid: 2}).paragraph({paragraph: 1, word: 42}), '/users/123/2/paragraph/1/42');

})

test('router location change handler should update path and routes', t => {

  const {routes, handlers, INITIAL_STATE, LOCATION_CHANGE} = createRouter(ROUTES);

  t.is(INITIAL_STATE.path, '', 'The initial path should be empty');
  t.deepEqual(INITIAL_STATE.routes, [], 'The matched routes array should be empty');

  const reducer = handleActions(handlers, INITIAL_STATE);

  const index = reducer(INITIAL_STATE, LOCATION_CHANGE('/'));

  t.is(index.path, '/');
  t.deepEqual(index.routes, [{component: IndexComponent, params: {}}]);

  const paragraph = reducer(INITIAL_STATE, LOCATION_CHANGE('/users/1/25/paragraph/10/42'));

  t.is(paragraph.path, '/users/1/25/paragraph/10/42');

  t.deepEqual(paragraph.routes, [
    {component: PostComponent, params: {uid: '1', pid: '25'}},
    {component: ParagraphComponent, params: {paragraph: '10', word: '42'}}
  ]);

  const paragraphTwo = reducer(paragraph, LOCATION_CHANGE('/users/1/25/paragraph/2/1'));

  t.is(paragraphTwo.path, '/users/1/25/paragraph/2/1');
  t.deepEqual(paragraphTwo.routes, [
    {component: PostComponent, params: {uid: '1', pid: '25'}},
    {component: ParagraphComponent, params: {paragraph: '2', word: '1'}}
  ]);

});

test('history push action should update the path, routes and create a task', t => {

  const {routes, handlers, INITIAL_STATE, HISTORY_PUSH} = createRouter(ROUTES);
  const reducer = handleActions(handlers, INITIAL_STATE);

  const indexUrl = '/';
  const index = reducer(INITIAL_STATE, HISTORY_PUSH(indexUrl));

  const indexTasks = drainTasksForTesting() as LocationTask[];

  t.is(indexTasks.length, 1);
  t.is(indexTasks[0].type, HISTORY_PUSH_TASK);
  t.is(indexTasks[0].url, indexUrl);

  t.is(index.path, '/');
  t.deepEqual(index.routes, [{component: IndexComponent, params: {}}]);

  const paragraphUrl = '/users/1/25/paragraph/10/42';
  const paragraph = reducer(index, HISTORY_PUSH(paragraphUrl));

  const paraTasks = drainTasksForTesting() as LocationTask[];

  t.is(paraTasks.length, 1);
  t.is(paraTasks[0].type, HISTORY_PUSH_TASK);
  t.is(paraTasks[0].url, paragraphUrl);

  t.deepEqual(paragraph.routes, [
    {component: PostComponent, params: {uid: '1', pid: '25'}},
    {component: ParagraphComponent, params: {paragraph: '10', word: '42'}}
  ]);

});
