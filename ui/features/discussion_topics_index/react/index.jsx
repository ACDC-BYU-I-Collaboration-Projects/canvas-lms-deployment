/*
 * Copyright (C) 2018 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react'
import {createRoot} from 'react-dom/client'
import {Provider} from 'react-redux'
import {ApolloProvider, createClient} from '@canvas/apollo-v3'
import AlertManager from '@canvas/alerts/react/AlertManager'

import {subscribeFlashNotifications} from '@canvas/notifications/redux/actions'
import {ConnectedDiscussionsIndex} from './components/DiscussionsIndex'
import createStore from './store'

const client = createClient()

export default function createDiscussionsIndex(rootElement, data = {}) {
  const store = createStore(data)
  const root = createRoot(rootElement)

  function unmount() {
    root.unmount()
  }

  function render() {
    root.render(
      <ApolloProvider client={client}>
        <Provider store={store}>
          <AlertManager>
            <ConnectedDiscussionsIndex />
          </AlertManager>
        </Provider>
      </ApolloProvider>,
    )
  }

  subscribeFlashNotifications(store)

  return {unmount, render}
}
