export const meta = {
  name: 'gtm-a2-content',
  description: 'FAN-OUT A2: the slice missions and side content, eight workers in their own worktrees, each bot-tested',
  phases: [{ title: 'Author', detail: 'eight content workers, two at a time, each in its own worktree on disjoint new files' }],
}
const RUN = { type: 'object', properties: { id: { type: 'string' }, level: { type: 'number' }, seed: { type: 'number' }, pad: { type: 'boolean' }, passed: { type: 'boolean' }, medal: { type: 'string' }, secs: { type: 'number' }, note: { type: 'string' } }, required: ['id', 'passed'] }
const RESULT = { type: 'object', properties: {
  files: { type: 'array', items: { type: 'string' } },
  runs: { type: 'array', items: RUN },
  notes: { type: 'string' },
  motorRequests: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, change: { type: 'string' }, why: { type: 'string' } }, required: ['change', 'why'] } },
}, required: ['files', 'runs', 'notes', 'motorRequests'] }
const brief = g => args.common.split('HEAD_SHA').join(args.head).split('OUT/').join(args.out + '/' + g.key + '/').split('OUT ').join(args.out + '/' + g.key + ' ').split('FILES').join(g.files.join(', ')) + '\n\nYOUR TASK (' + g.key + '):\n' + g.task
phase('Author')
log('eight workers, two at a time (the cores less two), heaviest first')
const res = await parallel(args.groups.map(g => () => agent(brief(g), { label: 'a2:' + g.key, phase: 'Author', schema: RESULT, isolation: 'worktree' })))
return args.groups.map((g, i) => ({ key: g.key, done: !!res[i], files: res[i] ? res[i].files : [], runs: res[i] ? res[i].runs : [], notes: res[i] ? res[i].notes : 'no result', motorRequests: res[i] ? res[i].motorRequests : [] }))
