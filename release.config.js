module.exports = {
  'branches': ['main'],
  'plugins': [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        'changelogFile': 'docs/_includes/changelog.md'
      }
    ],
    '@semantic-release/npm',
    [
      '@semantic-release/github',
      {
        'assets': [
          {
            'path': 'dist/toggl-button-chrome-*.zip',
            'label': 'Button for Toggl for Chrome'
          },
          {
            'path': 'dist/toggl-button-firefox-*.zip',
            'label': 'Button for Toggl for Firefox'
          }
        ]
      }
    ],
    [
      '@semantic-release/git',
      {
        'assets': [
          'docs/_includes/changelog.md',
          'package.json',
          'package-lock.json'
        ]
      }
    ]
  ],
  'tagFormat': '${version}' // eslint-disable-line no-template-curly-in-string
};
