/// <reference path="./index.d.ts" />

import browser from 'webextension-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import { addSeconds, differenceInSeconds } from 'date-fns';

import { secToHhmmImproved } from './@toggl/time-format-utils';
import { formatDuration } from './@toggl/time-format-utils/format-duration';
import Summary from './components/Summary';
import TimeEntriesList from './components/TimeEntriesList';
import Pomodoro from './components/Pomodoro';
import Timer from './components/Timer';
import { ProjectAutoComplete, TagAutoComplete } from './lib/autocomplete';
import { parseDuration } from './lib/timerUtils';
import { groupTimeEntriesByDay } from './lib/groupUtils';
import renderLogin from './initializers/login';

let TogglButton = browser.extension.getBackgroundPage().TogglButton;
const FF = navigator.userAgent.indexOf('Chrome') === -1;

if (FF) {
  document.querySelector('body').classList.add('ff');
}

const Popup = {
  $postStartText: ' post-start popup',
  $popUpButton: null,
  $errorLabel: document.querySelector('.error'),
  $projectAutocomplete: null,
  $tagAutocomplete: null,
  $timer: null,
  $tagsVisible: false,
  mousedownTrigger: null,
  projectBlurTrigger: null,
  editFormAdded: false,
  durationChanged: false,
  $billable: null,
  $header: document.querySelector('.header'),
  $menuView: document.querySelector('#menu'),
  $editView: document.querySelector('#toggl-button-entry-form'),
  $loginView: document.querySelector('#login-view'),
  $revokedWorkspaceView: document.querySelector('#revoked-workspace'),
  $entries: document.querySelector('.entries-list'),
  defaultErrorMessage: 'Error connecting to server',
  showPage: function () {
    let dom;
    if (!TogglButton) {
      TogglButton = browser.extension.getBackgroundPage().TogglButton;
    }

    try {
      if (TogglButton.$user !== null) {
        if (!PopUp.editFormAdded) {
          dom = document.createElement('div');
          dom.innerHTML = TogglButton.getEditForm();
          PopUp.$editView.appendChild(dom.firstChild);
          PopUp.addEditEvents();
          PopUp.editFormAdded = true;
        }

        if (TogglButton.$curEntry === null) {
          if (TogglButton.$latestStoppedEntry) {
            localStorage.setItem(
              'latestStoppedEntry',
              JSON.stringify(TogglButton.$latestStoppedEntry)
            );
          }
        }
        if (!PopUp.$header.getAttribute('data-view')) {
          PopUp.switchView(PopUp.$menuView);
        }

        Popup.renderApp();
      } else {
        localStorage.setItem('latestStoppedEntry', '');
        PopUp.switchView(PopUp.$loginView);
      }
    } catch (e) {
      browser.runtime.sendMessage({
        type: 'error',
        stack: e.stack,
        category: 'Popup'
      });
    }
  },

  renderApp: function () {
    PopUp.renderTimer();
    PopUp.renderEntriesList();
    PopUp.renderSummary();
  },

  renderSummary: function () {
    const rootElement = document.getElementById('root-summary');
    const totals = TogglButton.calculateSums();
    ReactDOM.unmountComponentAtNode(rootElement);
    ReactDOM.render(<Summary totals={totals} />, rootElement);
  },

  renderTimer: function () {
    const rootElement = document.getElementById('root-timer');
    const entry = TogglButton.$curEntry;
    const project = entry && TogglButton.findProjectByPid(entry.pid) || null;
    ReactDOM.render(<Timer entry={entry} project={project} />, rootElement);
  },

  sendMessage: function (request) {
    if (process.env.DEBUG) {
      console.info('Popup:sendMessage', request);
    }
    return browser.runtime.sendMessage(request)
      .then(function (response) {
        if (process.env.DEBUG) {
          console.info('Popup:sendMessageResponse', response, request);
        }

        if (!response) {
          return;
        }

        if (
          request.type === 'list-continue' &&
        !request.data &&
        !response.success
        ) {
          return PopUp.switchView(PopUp.$revokedWorkspaceView);
        }

        if (response.success) {
          if (request.type === 'create-workspace') {
            return PopUp.switchView(PopUp.$menuView);
          }
          if (response.type === 'Update') {
            // Edit form update
            TogglButton = browser.extension.getBackgroundPage().TogglButton;
            // Current TE update
            PopUp.renderApp();
          } else if (response.type === 'delete') {
            PopUp.renderApp();
          } else if (response.type === 'update') {
            // Current TE update
            PopUp.renderTimer();
          } else if (response.type === 'Stop') {
            PopUp.renderApp();
          } else if (response.type === 'list-continue' || response.type === 'New Entry') {
            PopUp.renderTimer();
            PopUp.renderEntriesList();
          } else {
            window.location.reload();
          }
        } else if (
          request.type === 'login' ||
        (!!response.type &&
          (response.type === 'New Entry' || response.type === 'Update'))
        ) {
          PopUp.showError(response.error || PopUp.defaultErrorMessage);
        }
      })
      .catch(e => {
        throw new Error(e);
      });
  },

  showError: function (errorMessage) {
    PopUp.$errorLabel.textContent = errorMessage;
    PopUp.$errorLabel.classList.add('show');
    setTimeout(function () {
      PopUp.$errorLabel.classList.remove('show');
    }, 3000);
  },

  renderEntriesList: function () {
    if (TogglButton.pomodoroFocusMode && TogglButton.pomodoroAlarm) {
      ReactDOM.render(<Pomodoro entry={TogglButton.$curEntry} interval={TogglButton.pomodoroInterval} />, document.getElementById('root-time-entries-list'));
      return;
    }
    const entries = TogglButton.$user.time_entries;
    if (!entries || entries.length < 1) {
      ReactDOM.render(<TimeEntriesList />, document.getElementById('root-time-entries-list'));
      return;
    }

    // Transform entries into an ordered list of grouped time entries
    const { listEntries, projects } = groupTimeEntriesByDay(entries);

    // Render react tree
    ReactDOM.render(<TimeEntriesList timeEntries={listEntries} projects={projects} />, document.getElementById('root-time-entries-list'));
  },

  switchView: function (view) {
    if (view === PopUp.$loginView) {
      renderLogin(PopUp.$loginView, true);
    }
    PopUp.$header.setAttribute('data-view', view.id);
  },

  formatMe: function (n) {
    return n < 10 ? '0' + n : n;
  },

  /* Edit form functions */

  /**
   * Render edit-form for given time entry object
   * @param timeEntry {Toggl.TimeEntry} - The time entry object to render
   */
  renderEditForm: function (timeEntry) {
    const pid = timeEntry.pid || 0;
    const tid = timeEntry.tid || 0;
    const wid = timeEntry.wid;
    const togglButtonDescription = document.querySelector(
      '#toggl-button-description'
    );
    const togglButtonDuration = document.querySelector('#toggl-button-duration');
    const isCurrentEntry = TogglButton.$curEntry && TogglButton.$curEntry.id === timeEntry.id;

    const editView = document.getElementById('toggl-button-edit-form');
    if (timeEntry.id && editView) {
      editView.dataset.timeEntryId = timeEntry.id;
      editView.dataset.workspaceId = timeEntry.wid;
      editView.dataset.startTime = timeEntry.start;
      editView.dataset.stopTime = timeEntry.stop || '';
    }

    const duration = differenceInSeconds(
      new Date(isCurrentEntry ? undefined : timeEntry.stop),
      new Date(timeEntry.start)
    );
    togglButtonDescription.value = timeEntry.description || '';
    togglButtonDuration.value = secToHhmmImproved(duration, { html: false });

    PopUp.$projectAutocomplete.setup(pid, tid);
    PopUp.$tagAutocomplete.setup(timeEntry.tags, wid);

    PopUp.setupBillable(!!timeEntry.billable, pid);
    PopUp.switchView(PopUp.$editView);

    // Put focus to the beginning of desctiption field
    togglButtonDescription.focus();
    togglButtonDescription.setSelectionRange(0, 0);
    togglButtonDescription.scrollLeft = 0;

    PopUp.durationChanged = false;
    // Setup duration updater if entry is running
    if (isCurrentEntry) {
      PopUp.updateDurationInput(true);
    }
  },

  updateDurationInput: function (startTimer) {
    if (TogglButton.$curEntry === null) {
      PopUp.stopDurationInput();
      return;
    }

    const duration = formatDuration(TogglButton.$curEntry.start);
    const durationField = document.querySelector('#toggl-button-duration');

    // Update edit form duration field
    if (PopUp.durationChanged === false) {
      durationField.value = duration;
    }

    if (startTimer) {
      PopUp.stopDurationInput();
      PopUp.$timer = setInterval(function () {
        if (process.env.DEBUG) console.log('🕒🐭 Tick tock, the mouse ran up the clock..');
        PopUp.updateDurationInput();
      }, 1000);
    }
  },

  stopDurationInput: function () {
    clearInterval(PopUp.$timer);
  },

  updateBillable: function (pid, noOverwrite) {
    let project;
    let i;
    let pwid = TogglButton.$user.default_wid;
    const ws = TogglButton.$user.workspaces;
    let premium;

    if (pid === 0) {
      pwid = TogglButton.$user.default_wid;
    } else {
      project = TogglButton.findProjectByPid(pid);
      if (!project) {
        return;
      }
      pwid = project.wid;
    }

    for (i = 0; i < ws.length; i++) {
      if (ws[i].id === pwid) {
        premium = ws[i].premium;
        break;
      }
    }

    PopUp.toggleBillable(premium);

    if (!noOverwrite && (pid !== 0 && project.billable)) {
      PopUp.$billable.classList.toggle('tb-checked', true);
    }
  },

  isNumber: function (n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  },

  toggleBillable: function (visible) {
    const tabIndex = visible ? '0' : '-1';
    PopUp.$billable.setAttribute('tabindex', tabIndex);
    PopUp.$billable.classList.toggle('no-billable', !visible);
  },

  setupBillable: function (billable, pid) {
    PopUp.updateBillable(pid, true);
    PopUp.$billable.classList.toggle('tb-checked', billable);
  },

  updateTimeEntry: function () {
    PopUp.stopDurationInput();

    // Translate human duration input if submitted without blurring
    const $duration = document.querySelector('#toggl-button-duration');
    let duration = $duration.value;
    if (duration) {
      duration = parseDuration(duration).asSeconds();
      $duration.value = secToHhmmImproved(duration, { html: false });
    }

    if (!this.isformValid()) {
      return;
    }

    const selected = PopUp.$projectAutocomplete.getSelected();
    const billable = !!document.querySelector(
      '.tb-billable.tb-checked:not(.no-billable)'
    );

    const request = {
      type: 'update',
      description: document.querySelector('#toggl-button-description').value,
      pid: selected.pid,
      projectName: selected.name,
      tags: PopUp.$tagAutocomplete.getSelected(),
      tid: selected.tid,
      respond: true,
      billable: billable,
      service: 'dropdown'
    };
    const editView = document.getElementById('toggl-button-edit-form');
    const timeEntryId = editView.dataset.timeEntryId;
    if (timeEntryId) {
      request.id = +timeEntryId;
    }
    const workspaceId = editView.dataset.workspaceId;
    if (workspaceId) {
      request.wid = +workspaceId;
    }

    const startTime = editView.dataset.startTime;
    const stopTime = editView.dataset.stopTime;

    if (duration) {
      if (startTime && stopTime) {
        request.start = new Date(startTime).toISOString();
        request.duration = duration;
        request.stop = addSeconds(new Date(startTime), duration).toISOString();
      } else {
        const start = new Date(
          (new Date()).getTime() - duration * 1000
        );
        request.start = start.toISOString();
        request.duration = -1 * Math.floor(start.getTime() / 1000);
      }
    }

    PopUp.sendMessage(request);
    PopUp.switchView(PopUp.$menuView);
  },

  deleteTimeEntry: function () {
    const editView = document.getElementById('toggl-button-edit-form');
    const timeEntryId = editView.dataset.timeEntryId;

    const request = {
      type: 'delete',
      id: timeEntryId
    };

    Popup.sendMessage(request);
    PopUp.switchView(PopUp.$menuView);
  },

  closeForm: function () {
    PopUp.switchView(PopUp.$menuView);
  },

  isformValid: function () {
    return !!document.querySelector('#toggl-button-edit-form form:valid');
  },

  addEditEvents: function () {
    /* Edit form events */
    PopUp.$projectAutocomplete = new ProjectAutoComplete(
      'project',
      'li',
      PopUp
    );
    PopUp.$tagAutocomplete = new TagAutoComplete('tag', 'li', PopUp);
    PopUp.$billable = document.querySelector('.tb-billable');

    document
      .querySelector('#toggl-button-update')
      .addEventListener('click', function (e) {
        PopUp.updateTimeEntry(this);
      });

    document
      .querySelector('#toggl-button-update')
      .addEventListener('keydown', function (e) {
        if (e.code === 'Enter' || e.code === 'Space') {
          PopUp.updateTimeEntry(this);
        }
      });

    // Cancel button
    document.querySelector('#tb-edit-form-cancel')
      .addEventListener('click', function (e) {
        e.preventDefault();
        PopUp.closeForm();
      });
    document.querySelector('#tb-edit-form-cancel')
      .addEventListener('keydown', function (e) {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          PopUp.closeForm();
        }
      });

    // Delete button
    document
      .querySelector('#toggl-button-delete')
      .addEventListener('click', function (e) {
        PopUp.deleteTimeEntry(this);
      });

    document
      .querySelector('#toggl-button-delete')
      .addEventListener('keydown', function (e) {
        if (e.code === 'Enter' || e.code === 'Space') {
          PopUp.deleteTimeEntry(this);
        }
      });

    document
      .querySelector('#toggl-button-entry-form form')
      .addEventListener('submit', function (e) {
        PopUp.updateTimeEntry(this);
        e.preventDefault();
      });

    document
      .querySelector('#toggl-button-duration')
      .addEventListener('focus', (e) => {
        PopUp.stopDurationInput();
      });
    document
      .querySelector('#toggl-button-duration')
      .addEventListener('blur', (e) => {
        PopUp.updateDurationInput(true);
      });

    PopUp.$projectAutocomplete.onChange(function (selected) {
      const project = TogglButton.findProjectByPid(selected.pid);

      const wid = project ? project.wid : TogglButton.$curEntry.wid;

      PopUp.$tagAutocomplete.setWorkspaceId(wid);
    });

    PopUp.$billable.addEventListener('click', function () {
      this.classList.toggle('tb-checked');
    });

    PopUp.$billable.addEventListener('keydown', function (e) {
      let prevent = false;
      if (e.code === 'Space') {
        prevent = true;
        this.classList.toggle('tb-checked');
      }

      if (e.code === 'ArrowLeft') {
        prevent = true;
        this.classList.toggle('tb-checked', false);
      }

      if (e.code === 'ArrowRight') {
        prevent = true;
        this.classList.toggle('tb-checked', true);
      }

      if (prevent) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
  },

  handleBackgroundMessage: function (request) {
    if (process.env.DEBUG) {
      console.log('Popup:handleBackgroundMessage', request);
    }
    switch (request.type) {
      case 'bg/render-entries-list':
        Popup.renderEntriesList();
        break;
    }
  }
};
window.PopUp = Popup;

document.addEventListener('DOMContentLoaded', function () {
  const req = {
    type: 'sync',
    respond: false
  };

  try {
    PopUp.sendMessage(req);
    PopUp.showPage();

    document
      .querySelector('.header .sync-data')
      .addEventListener('click', function () {
        const request = { type: 'sync' };
        browser.runtime.sendMessage(request).catch(e => {
          throw new Error(e);
        });
      });

    document
      .querySelector('.header .cog')
      .addEventListener('click', function () {
        const request = {
          type: 'options',
          respond: false
        };

        browser.runtime.sendMessage(request).catch(e => {
          throw new Error(e);
        });
      });

    document
      .querySelector('#workspace')
      .addEventListener('submit', function (event) {
        event.preventDefault();
        const workspace = document.querySelector('#workspace_name').value;
        if (!workspace) {
          return PopUp.showError('Enter a workspace name');
        }
        const request = {
          type: 'create-workspace',
          respond: true,
          workspace
        };
        PopUp.sendMessage(request);
      });

    // TODO: Properly fix this
    // Bugsnag error 5dde294cb118e1001ae5a1d7
    const durationElement = document.querySelector('#toggl-button-duration');
    if (durationElement) {
      durationElement
        .addEventListener('keydown', function (event) {
          // Doesn't cover all cases; can't really do it without introducing more state.
          // Need a refactor.
          if (event.code !== 'Enter' && event.code !== 'Tab') {
            PopUp.durationChanged = true;
          }
        });
      durationElement
        .addEventListener('blur', function (event) {
          const value = event.target.value || '';
          const parsedInput = parseDuration(value).asSeconds();
          event.target.value = secToHhmmImproved(parsedInput, { html: false });
        });
    }

    PopUp.$entries.addEventListener('click', function (e) {
      if (!e.target.dataset.continueId) {
        return;
      }
      e.stopPropagation();
      const id = e.target.dataset.continueId;
      const timeEntry = TogglButton.$user.time_entries.find((entry) => entry.id === +id);

      const request = {
        type: 'list-continue',
        respond: true,
        service: 'dropdown-list',
        data: timeEntry
      };

      PopUp.sendMessage(request);
      window.scrollTo(0, 0);
    });
  } catch (e) {
    browser.runtime.sendMessage({
      type: 'error',
      stack: e.stack,
      category: 'Popup'
    });
  }

  browser.runtime.onMessage.addListener(Popup.handleBackgroundMessage);
});
