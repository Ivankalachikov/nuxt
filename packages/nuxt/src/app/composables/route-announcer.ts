import type { Ref } from 'vue'
import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { getActiveHead } from 'unhead'
import { useNuxtApp } from '#app'

export enum Politeness {
  Assertive = 'assertive',
  Polite = 'polite',
  Off = 'off',
}

export type PolitenessValue = `${Politeness}`

export type NuxtRouteAnnouncerOpts = {
  /** @default 'polite' */
  politeness?: PolitenessValue
}

export type RouteAnnouncer = {
  message: Ref<string>
  politeness: Ref<PolitenessValue>
  set: (message: string, politeness: PolitenessValue) => void
  polite: (message: string) => void
  assertive: (message: string) => void
  _cleanup: () => void
}

function createRouteAnnouncer (opts: NuxtRouteAnnouncerOpts = {}) {
  const message = ref('')
  const politeness = ref<PolitenessValue>(opts.politeness || Politeness.Polite)
  const activeHead = getActiveHead()

  function set (messageValue: string = '', politenessSetting: PolitenessValue = Politeness.Polite) {
    message.value = messageValue
    politeness.value = politenessSetting
  }

  function polite (message: string) {
    return set(message, Politeness.Polite)
  }

  function assertive (message: string) {
    return set(message, Politeness.Assertive)
  }

  function _updateMessageWithPageHeading () {
    set(document?.title?.trim(), politeness.value)
  }

  function _cleanup () {
    activeHead?.hooks?.removeHook('dom:rendered', _updateMessageWithPageHeading)
  }

  _updateMessageWithPageHeading()

  activeHead?.hooks?.hook('dom:rendered', () => {
    _updateMessageWithPageHeading()
  })

  return {
    _cleanup,
    message,
    politeness,
    set,
    polite,
    assertive,
  }
}

/**
 * composable to handle the route announcer
 * @since 3.12.0
 */
export function useRouteAnnouncer (opts: Partial<NuxtRouteAnnouncerOpts> = {}): Omit<RouteAnnouncer, '_cleanup'> {
  const nuxtApp = useNuxtApp()

  // Initialise global route announcer if it doesn't exist already
  const announcer = nuxtApp._routeAnnouncer = nuxtApp._routeAnnouncer || createRouteAnnouncer(opts)
  if (opts.politeness !== announcer.politeness.value) {
    announcer.politeness.value = opts.politeness || Politeness.Polite
  }
  if (import.meta.client && getCurrentScope()) {
    nuxtApp._routeAnnouncerDeps = nuxtApp._routeAnnouncerDeps || 0
    nuxtApp._routeAnnouncerDeps++
    onScopeDispose(() => {
      nuxtApp._routeAnnouncerDeps!--
      if (nuxtApp._routeAnnouncerDeps === 0) {
        announcer._cleanup()
        delete nuxtApp._routeAnnouncer
      }
    })
  }

  return announcer
}
