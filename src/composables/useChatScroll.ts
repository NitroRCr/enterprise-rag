import type { Ref } from 'vue'

/**
 * 对话滚动控制：上一条/下一条/顶部/底部，以及流式时锁定底部。
 * 移植自 nyaai 的 chat-scroll。
 */
export function useChatScroll(scrollContainer: Ref<HTMLElement | null | undefined>) {
  function getEls() {
    const container = scrollContainer.value!
    const items = Array.from(container?.querySelectorAll<HTMLElement>('.message-item') ?? [])
    return { container, items }
  }
  function itemInView(item: HTMLElement, container: HTMLElement) {
    return item.offsetTop <= container.scrollTop + container.clientHeight &&
      item.offsetTop + item.clientHeight > container.scrollTop
  }
  function scroll(action: 'up' | 'down' | 'top' | 'bottom', behavior: ScrollBehavior = 'smooth') {
    const { container, items } = getEls()
    if (!container) return
    if (action === 'top') return container.scrollTo({ top: 0, behavior })
    if (action === 'bottom') return container.scrollTo({ top: container.scrollHeight, behavior })

    const index = items.findIndex(item => itemInView(item, container))
    if (index === -1) return
    const item = items[index]
    let top: number
    if (action === 'up') {
      if (container.scrollTop - item.offsetTop < 5) {
        top = index === 0 ? 0 : items[index - 1].offsetTop
      } else {
        top = item.offsetTop
      }
    } else {
      top = index === items.length - 1 ? container.scrollHeight : items[index + 1].offsetTop
    }
    container.scrollTo({ top: top + 2, behavior })
  }

  return { getEls, itemInView, scroll }
}
