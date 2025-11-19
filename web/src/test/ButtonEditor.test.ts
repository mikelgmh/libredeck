import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createApp } from 'vue'
import ButtonEditor from '../components/ButtonEditor.vue'
import type { ButtonData } from '../types/streamdeck'

// Mock the i18n composable
vi.mock('../composables/useI18n', () => ({
  useI18nStore: () => ({
    t: (key: string) => key,
  }),
}))

describe('ButtonEditor', () => {
  const mockButtonConfig: ButtonData = {
    label: 'Test Button',
    textTop: 'Top Text',
    textBottom: 'Bottom Text',
    fontSize: 14,
    emoji: '😀',
    backgroundColor: '#ffffff',
    textColor: '#000000',
    actions: [],
  }

  const mockProps = {
    buttonConfig: mockButtonConfig,
    availablePages: [],
    plugins: [],
  }

  it('renders button editor form', () => {
    const wrapper = mount(ButtonEditor, {
      props: mockProps,
      global: {
        stubs: ['IconPicker', 'ActionEditor'],
      },
    })

    expect(wrapper.exists()).toBe(true)
    expect(wrapper.text()).toContain('textTop')
    expect(wrapper.text()).toContain('textBottom')
  })

  it('updates text top when input changes', async () => {
    const wrapper = mount(ButtonEditor, {
      props: mockProps,
      global: {
        stubs: ['IconPicker', 'ActionEditor'],
      },
    })

    const input = wrapper.find('input[placeholder="Texto superior (opcional)"]')
    await input.setValue('New Top Text')

    expect(wrapper.emitted('update:textTop')).toBeTruthy()
    expect(wrapper.emitted('update:textTop')![0]).toEqual(['New Top Text'])
  })

  it('updates text bottom when input changes', async () => {
    const wrapper = mount(ButtonEditor, {
      props: mockProps,
      global: {
        stubs: ['IconPicker', 'ActionEditor'],
      },
    })

    const input = wrapper.find('input[placeholder="Texto inferior (opcional)"]')
    await input.setValue('New Bottom Text')

    expect(wrapper.emitted('update:textBottom')).toBeTruthy()
    expect(wrapper.emitted('update:textBottom')![0]).toEqual(['New Bottom Text'])
  })

  it('updates font size when input changes', async () => {
    const wrapper = mount(ButtonEditor, {
      props: mockProps,
      global: {
        stubs: ['IconPicker', 'ActionEditor'],
      },
    })

    const input = wrapper.find('input[type="number"]')
    await input.setValue('16')

    expect(wrapper.emitted('update:fontSize')).toBeTruthy()
    expect(wrapper.emitted('update:fontSize')![0]).toEqual([16])
  })
})