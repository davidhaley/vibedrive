export default {
  namespaced: true,
  state: {
    status: 'paused',
    buffering: false,
    file: null,
    queue: [],
    history: [],
    progress: 0
  },
  mutations: {
    play (state) {
      state.buffering = false
      state.status = 'playing'
    },
    pause (state) {
      state.status = 'paused'
    },
    timeupdate (state, value) {
      state.progress = value
    },
    setDuration (state, duration) {
      state.file.duration = duration
    },
    load (state, file) {
      state.buffering = true
      state.file = file
    },
    prev (state) {
      state.status = 'paused'
      state.buffering = true
      state.queue.unshift(state.file)
      state.file = state.history.pop()
    },
    next (state) {
      state.status = 'paused'
      state.buffering = true
      state.history.push(state.file)
      state.file = state.queue.shift()
    },
    swap (state) {
      state.active.playerId = state.active.playerId === 0 ? 1 : 0
    },
    setQueue (state, queue) {
      state.queue = queue
    },
    pushToQueue (state, item) {
      state.queue.push(item)
    },
    concatQueue (state, queue) {
      state.queue = state.queue.concat(queue)
    }
  },
  actions: {
    load: function (context, file) {
      context.commit('load', file)
    },
    play: function (context) {
      if (!context.state.file) return

      context.commit('play')
    },
    pause: function (context) {
      if (!context.state.file) return

      context.commit('pause')
    },
    prev: function (context) {
      if (!context.state.history.length) return

      context.commit('prev')
    },
    next: function (context) {
      if (!context.state.queue.length) return

      context.commit('next')
    },
    'set-duration': function (context, duration) {
      context.commit('setDuration', parseInt(duration))
    },
    preview: function (context, file) {
      if (context.state.file && file.ino === context.state.file.ino) {
        return context.state.status === 'paused'
          ? context.dispatch('play')
          : context.dispatch('pause')
      }

      context.dispatch('pause')
      context.dispatch('load', file)
    },
    'queue:concat': function (context, queue) {
      context.commit('concatQueue', queue)
    },
    'queue:set': function (context, queue) {
      context.commit('setQueue', queue)
    },
    'queue:push': function (context, item) {
      context.commit('pushToQueue', item)
    },
    'el:timeupdate': function (context, $target) {
      var percent = ($target.currentTime / context.state.file.duration) * 100

      context.commit('timeupdate', percent)
    },
    'el:ended': function (context) {
      context.dispatch('next')
    },
    'el:canplay': function (context, id) {
      context.dispatch('play')
    }
  },
  getters: {
    status: state => state.status,
    file: state => state.file
  }
}
