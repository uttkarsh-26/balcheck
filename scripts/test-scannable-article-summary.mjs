#!/usr/bin/env node
import assert from 'node:assert/strict';
import { validateScannableArticleSummary } from '../src/components/scannableArticleSummaryContract.js';

const item = (index) => ({ label: `Fact ${index}`, value: `Value ${index}` });
const event = (index, datetime) => ({ date: `Date ${index}`, text: `Event ${index}`, ...(datetime ? { datetime } : {}) });
const step = (index) => `Step ${index}`;

const validBrief = {
  summary: 'PM Kisan status is checked on the official portal after the latest verified payment update.',
  facts: [1, 2, 3, 4, 5].map(item),
  timeline: [
    event(1, '2026-02-28'),
    event(2, '2026-03-01T09:30:00Z'),
    event(3, '2026-03-02T09:30+05:30'),
    event(4),
    event(5),
  ],
  action: { title: 'Next steps', steps: [1, 2, 3, 4, 5].map(step) },
};

assert.deepEqual(validateScannableArticleSummary(validBrief), []);
assert.deepEqual(validateScannableArticleSummary({ summary: 'Only the required direct answer is supplied.' }), []);
assert.deepEqual(validateScannableArticleSummary({
  summary: 'Check the latest payment update on the official portal.',
  action: { title: 'Official source', officialUrl: 'https://pmkisan.gov.in/' },
}), []);

const failures = [
  {
    name: 'summary over 35 words',
    brief: { ...validBrief, summary: Array.from({ length: 36 }, (_, index) => `word${index + 1}`).join(' ') },
    message: 'summary must contain at most 35 words',
  },
  {
    name: 'null fact',
    brief: { ...validBrief, facts: [null] },
    message: 'facts[0] must be a non-null object',
  },
  {
    name: 'fact with empty label',
    brief: { ...validBrief, facts: [{ label: '   ', value: 'Value' }] },
    message: 'facts[0].label must be a non-empty string',
  },
  {
    name: 'fact with non-string value',
    brief: { ...validBrief, facts: [{ label: 'Label', value: 42 }] },
    message: 'facts[0].value must be a non-empty string',
  },
  {
    name: 'null timeline event',
    brief: { ...validBrief, timeline: [null] },
    message: 'timeline[0] must be a non-null object',
  },
  {
    name: 'timeline event with empty date',
    brief: { ...validBrief, timeline: [{ date: '', text: 'Text' }] },
    message: 'timeline[0].date must be a non-empty string',
  },
  {
    name: 'timeline event with non-string text',
    brief: { ...validBrief, timeline: [{ date: 'Date', text: false }] },
    message: 'timeline[0].text must be a non-empty string',
  },
  {
    name: 'timeline event with non-string datetime',
    brief: { ...validBrief, timeline: [{ date: 'Date', text: 'Text', datetime: null }] },
    message: 'timeline[0].datetime must be a valid ISO calendar date or date-time with timezone',
  },
  {
    name: 'null action',
    brief: { ...validBrief, action: null },
    message: 'action must be a non-null object',
  },
  {
    name: 'action with empty title',
    brief: { ...validBrief, action: { title: '   ' } },
    message: 'action.title must be a non-empty string',
  },
  {
    name: 'action with non-array steps',
    brief: { ...validBrief, action: { title: 'Action', steps: 'not an array' } },
    message: 'action.steps must be an array when supplied',
  },
  {
    name: 'action with empty step',
    brief: { ...validBrief, action: { title: 'Action', steps: ['   '] } },
    message: 'action.steps[0] must be a non-empty string',
  },
  {
    name: 'action with non-string official URL',
    brief: { ...validBrief, action: { title: 'Action', officialUrl: 123 } },
    message: 'action.officialUrl must be a string when supplied',
  },
  {
    name: 'action with empty official label',
    brief: { ...validBrief, action: { title: 'Action', officialLabel: '' } },
    message: 'action.officialLabel must be a non-empty string',
  },
  {
    name: 'null details',
    brief: { ...validBrief, details: null },
    message: 'details must be a non-null object',
  },
  {
    name: 'details with empty title',
    brief: { ...validBrief, details: { title: '', body: 'Body' } },
    message: 'details.title must be a non-empty string',
  },
  {
    name: 'details with non-string body',
    brief: { ...validBrief, details: { title: 'Title', body: 99 } },
    message: 'details.body must be a non-empty string',
  },
  {
    name: 'fact with non-string label',
    brief: { ...validBrief, facts: [{ label: 42, value: 'Value' }] },
    message: 'facts[0].label must be a non-empty string',
  },
  {
    name: 'fact with empty value',
    brief: { ...validBrief, facts: [{ label: 'Label', value: '   ' }] },
    message: 'facts[0].value must be a non-empty string',
  },
  {
    name: 'array timeline event',
    brief: { ...validBrief, timeline: [[]] },
    message: 'timeline[0] must be a non-null object',
  },
  {
    name: 'timeline event with non-string date',
    brief: { ...validBrief, timeline: [{ date: 42, text: 'Text' }] },
    message: 'timeline[0].date must be a non-empty string',
  },
  {
    name: 'timeline event with empty text',
    brief: { ...validBrief, timeline: [{ date: 'Date', text: '  ' }] },
    message: 'timeline[0].text must be a non-empty string',
  },
  {
    name: 'array action',
    brief: { ...validBrief, action: [] },
    message: 'action must be a non-null object',
  },
  {
    name: 'action with non-string step',
    brief: { ...validBrief, action: { title: 'Action', steps: [false] } },
    message: 'action.steps[0] must be a non-empty string',
  },
  {
    name: 'array details',
    brief: { ...validBrief, details: [] },
    message: 'details must be a non-null object',
  },
  {
    name: 'more than 5 facts',
    brief: { ...validBrief, facts: [1, 2, 3, 4, 5, 6].map(item) },
    message: 'facts must contain at most 5 items',
  },
  {
    name: 'more than 5 timeline items',
    brief: { ...validBrief, timeline: [1, 2, 3, 4, 5, 6].map(index => event(index)) },
    message: 'timeline must contain at most 5 items',
  },
  {
    name: 'more than 5 action steps',
    brief: { ...validBrief, action: { ...validBrief.action, steps: [1, 2, 3, 4, 5, 6].map(step) } },
    message: 'action.steps must contain at most 5 items',
  },
  {
    name: 'non-array supplied action steps',
    brief: { ...validBrief, action: { ...validBrief.action, steps: 'not an array' } },
    message: 'action.steps must be an array when supplied',
  },
  {
    name: 'timeline datetime without timezone',
    brief: { ...validBrief, timeline: [event(1, '2026-02-28T09:30:00')] },
    message: 'timeline[0].datetime must be a valid ISO calendar date or date-time with timezone',
  },
  {
    name: 'invalid ISO calendar date',
    brief: { ...validBrief, timeline: [event(1, '2026-02-30')] },
    message: 'timeline[0].datetime must be a valid ISO calendar date or date-time with timezone',
  },
  {
    name: 'timezone offset beyond ISO range',
    brief: { ...validBrief, timeline: [event(1, '2026-02-28T09:30:00+23:59')] },
    message: 'timeline[0].datetime must be a valid ISO calendar date or date-time with timezone',
  },
];

for (const failure of failures) {
  const errors = validateScannableArticleSummary(failure.brief);
  assert.ok(errors.includes(failure.message), `${failure.name}: expected ${failure.message}`);
}

console.log(`ScannableArticleSummary validator: ${failures.length + 3} cases passed`);
