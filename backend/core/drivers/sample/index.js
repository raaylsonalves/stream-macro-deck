module.exports = {
  id: 'com.sample.logger',
  name: 'Sample Logger Plugin',
  description: 'A simple plugin that logs actions to console',
  hooks: {
    onLoad: () => console.log('--> Sample Logger Plugin initialized!'),
    onUnload: () => console.log('--> Sample Logger Plugin unloaded!')
  },
  actions: [
    {
      id: 'log_message',
      name: 'Log Message',
      execute: (payload) => {
        console.log(`[Sample Plugin] Action 'log_message' triggered with payload:`, payload);
      }
    }
  ]
};
