/*
 * Copyright (C) 2019 - present Instructure, Inc.
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
import {render, fireEvent, act} from '@testing-library/react'
import * as rtl from '@testing-library/react'
import fetchMock from 'fetch-mock'
import useManagedCourseSearchApi from '../../effects/useManagedCourseSearchApi'
import useModuleCourseSearchApi, {
  useCourseModuleItemApi,
} from '../../effects/useModuleCourseSearchApi'
import DirectShareCoursePanel from '../DirectShareCoursePanel'
import fakeENV from '@canvas/test-utils/fakeENV'

jest.mock('../../effects/useManagedCourseSearchApi')
jest.mock('../../effects/useModuleCourseSearchApi')

describe('DirectShareCoursePanel', () => {
  let ariaLive

  beforeAll(() => {
    ariaLive = document.createElement('div')
    ariaLive.id = 'flash_screenreader_holder'
    ariaLive.setAttribute('role', 'alert')
    document.body.appendChild(ariaLive)
  })

  afterAll(() => {
    if (ariaLive) ariaLive.remove()
  })

  beforeEach(() => {
    // Setup default ENV values
    fakeENV.setup({
      FEATURES: {
        validate_call_to_action: false,
      },
    })

    useManagedCourseSearchApi.mockImplementationOnce(({success}) => {
      success([
        {id: 'abc', name: 'abc'},
        {id: 'cde', name: 'cde'},
      ])
    })
  })

  afterEach(() => {
    fetchMock.restore()
    fakeENV.teardown()
    jest.clearAllMocks()
  })

  it('shows the overwrite warning', () => {
    const {getByText} = render(<DirectShareCoursePanel />)
    expect(
      getByText(
        'Previously imported content from the same course will be replaced. Manually added content will remain.',
      ),
    ).toBeInTheDocument()
  })

  it('calls the onCancel property', () => {
    const handleCancel = jest.fn()
    const {getByText} = render(<DirectShareCoursePanel onCancel={handleCancel} />)
    fireEvent.click(getByText(/cancel/i))
    expect(handleCancel).toHaveBeenCalled()
  })

  it('starts a copy operation and reports status', async () => {
    fetchMock.postOnce('path:/api/v1/courses/abc/content_migrations', {
      id: '8',
      workflow_state: 'running',
    })
    fetchMock.getOnce('path:/api/v1/courses/abc/modules', [])
    const {getByText, getAllByText, getByLabelText, queryByText} = render(
      <DirectShareCoursePanel
        sourceCourseId="42"
        contentSelection={{discussion_topics: ['1123']}}
      />,
    )
    const input = getByLabelText(/select a course/i)
    fireEvent.click(input)
    fireEvent.click(getByText('abc'))
    fireEvent.click(getByText(/copy/i))
    expect(queryByText('Copy')).toBeNull()
    expect(getByText('Close')).toBeInTheDocument()
    const [, fetchOptions] = fetchMock.lastCall()
    expect(fetchOptions.method).toBe('POST')
    expect(JSON.parse(fetchOptions.body)).toMatchObject({
      migration_type: 'course_copy_importer',
      select: {discussion_topics: ['1123']},
      settings: {source_course_id: '42'},
    })
    expect(getAllByText(/start/i)).not.toHaveLength(0)
    await act(() => fetchMock.flush(true))
    expect(getByText(/success/)).toBeInTheDocument()
    expect(queryByText('Copy')).toBeNull()
    expect(getByText('Close')).toBeInTheDocument()
  })

  it('deletes the module and removes the position selector when a new course is selected', async () => {
    useModuleCourseSearchApi.mockImplementationOnce(({success}) => {
      success([
        {id: '1', name: 'Module 1'},
        {id: '2', name: 'Module 2'},
      ])
    })

    const {getByText, getByLabelText, queryByText} = render(
      <DirectShareCoursePanel
        sourceCourseId="42"
        contentSelection={{discussion_topics: ['1123']}}
      />,
    )
    const courseSelector = getByText(/select a course/i)
    fireEvent.click(courseSelector)
    fireEvent.click(getByText('abc'))
    fireEvent.click(getByText(/select a module/i))

    // Mock useCourseModuleItemApi just before the module is selected
    useCourseModuleItemApi.mockImplementationOnce(({success}) => {
      success([
        {id: 'item1', title: 'Item 1'},
        {id: 'item2', title: 'Item 2'},
      ])
    })

    await act(async () => {
      fireEvent.click(getByText(/Module 1/))
    })

    expect(getByText(/Place/)).toBeInTheDocument()
    useManagedCourseSearchApi.mockImplementationOnce(({success}) => {
      success([{id: 'ghi', name: 'foo'}])
    })
    useCourseModuleItemApi.mockClear()
    const input = getByLabelText(/select a course/i)
    fireEvent.change(input, {target: {value: 'f'}})
    fireEvent.click(getByText('foo'))
    expect(queryByText(/Place/)).not.toBeInTheDocument()
    expect(useCourseModuleItemApi).not.toHaveBeenCalled()
  })

  describe('Form validation', () => {
    describe('when validate_call_to_action is off', () => {
      beforeEach(() => {
        fakeENV.setup({
          FEATURES: {
            validate_call_to_action: false,
          },
        })
      })

      it('hides asterisk for course input', () => {
        render(<DirectShareCoursePanel />)
        expect(rtl.screen.getByLabelText(/select a course/i).getAttribute('required')).toBe(null)
      })

      it('disables the copy button initially', () => {
        const {getByText} = render(<DirectShareCoursePanel />)
        expect(getByText(/copy/i).closest('button').getAttribute('disabled')).toBe('')
      })

      it('enables the copy button when a course is selected', async () => {
        fetchMock.getOnce('path:/api/v1/courses/abc/modules', [])
        const {getByText} = render(<DirectShareCoursePanel />)
        fireEvent.click(getByText(/select a course/i))
        fireEvent.click(getByText('abc'))
        await act(() => fetchMock.flush(true))
        const copyButton = getByText(/copy/i).closest('button')
        expect(copyButton.getAttribute('disabled')).toBe(null)
      })

      it('disables the copy button again when a course search is initiated', async () => {
        fetchMock.getOnce('path:/api/v1/courses/abc/modules', [])
        const {getByText, getByLabelText} = render(<DirectShareCoursePanel />)
        const input = getByLabelText(/select a course/i)
        fireEvent.click(input)
        fireEvent.click(getByText('abc'))
        await act(() => fetchMock.flush(true))
        fireEvent.change(input, {target: {value: 'foo'}})
        expect(getByText(/copy/i).closest('button').getAttribute('disabled')).toBe('')
      })
    })

    describe('validate_call_to_action is on', () => {
      beforeEach(() => {
        fakeENV.setup({
          FEATURES: {
            validate_call_to_action: true,
          },
        })
      })

      it('shows asterisk for course input', () => {
        render(<DirectShareCoursePanel />)
        expect(rtl.screen.getByLabelText(/select a course/i).getAttribute('required')).toBe('')
      })

      it('enables the copy button initially', () => {
        render(<DirectShareCoursePanel />)
        expect(rtl.screen.getByText(/copy/i).closest('button').getAttribute('disabled')).toBe(null)
      })

      it('shows error message after course selection validation error', () => {
        render(<DirectShareCoursePanel />)
        fireEvent.click(rtl.screen.getByText(/copy/i))
        expect(rtl.screen.getByText(/please select a course/i)).toBeInTheDocument()
      })

      it('focuses on course input after course selection validation error', () => {
        render(<DirectShareCoursePanel />)
        fireEvent.click(rtl.screen.getByText(/copy/i))
        expect(rtl.screen.getByLabelText(/select a course/i)).toHaveFocus()
      })
    })
  })

  describe('errors', () => {
    beforeEach(() => {
      jest.spyOn(console, 'error').mockImplementation()
    })

    afterEach(() => {
      console.error.mockRestore()
    })

    it('reports an error if the fetch fails', async () => {
      fetchMock.postOnce('path:/api/v1/courses/abc/content_migrations', 400)
      fetchMock.getOnce('path:/api/v1/courses/abc/modules', [])
      const {getByText, getByLabelText, queryByText} = render(
        <DirectShareCoursePanel sourceCourseId="42" />,
      )
      const input = getByLabelText(/select a course/i)
      fireEvent.click(input)
      fireEvent.click(getByText('abc'))
      fireEvent.click(getByText('Copy'))
      await act(() => fetchMock.flush(true))
      expect(getByText(/problem/i)).toBeInTheDocument()
      expect(queryByText('Copy')).toBeNull()
      expect(getByText('Close')).toBeInTheDocument()
    })
  })
})
