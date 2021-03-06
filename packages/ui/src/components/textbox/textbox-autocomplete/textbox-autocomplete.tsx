/** @jsx h */
import classnames from '@sindresorhus/class-names'
import { h } from 'preact'
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks'

import { HTMLProps, Option } from '../../../types'
import {
  BACKSPACE_KEY_CODE,
  DELETE_KEY_CODE,
  DOWN_KEY_CODE,
  ENTER_KEY_CODE,
  ESCAPE_KEY_CODE,
  TAB_KEY_CODE,
  UP_KEY_CODE
} from '../../../utilities/key-codes'
import { TextboxProps } from '../textbox'
import styles from '../textbox.scss'
import { computeNextValue } from '../utilities/compute-next-value'
import { isKeyCodeCharacterGenerating } from '../utilities/is-keycode-character-generating'
import textboxAutocompleteStyles from './textbox-autocomplete.scss'

const EMPTY_STRING = ''
const INVALID_MENU_ITEM_ID = null

type Value = null | string
type MenuItemId = null | string

export type TextboxAutocompleteOption = Option
export interface TextboxAutocompleteProps extends TextboxProps {
  filter?: boolean
  options: TextboxAutocompleteOption[]
  strict?: boolean
  top?: boolean
}

export function TextboxAutocomplete({
  disabled,
  focused,
  filter,
  icon,
  name,
  noBorder,
  onChange,
  options,
  placeholder,
  strict,
  top,
  value: committedValue,
  ...rest
}: HTMLProps<TextboxAutocompleteProps, HTMLInputElement>): h.JSX.Element {
  const rootElementRef: preact.RefObject<HTMLDivElement> = useRef(null)
  const inputElementRef: preact.RefObject<HTMLInputElement> = useRef(null)
  const menuElementRef: preact.RefObject<HTMLDivElement> = useRef(null)
  const scrollTopRef = useRef(0)
  const shouldSelectAllRef = useRef(false) // Whether to select the contents of the textbox

  const [currentValue, setCurrentValue]: [Value, any] = useState(EMPTY_STRING)
  const [isMenuVisible, setIsMenuVisible] = useState(false)
  const [selectedId, setSelectedId]: [MenuItemId, any] = useState(
    INVALID_MENU_ITEM_ID
  )

  let menuItems: TextboxAutocompleteOption[] = options.map(function (
    option,
    index
  ) {
    return {
      id: `${index}`,
      ...option
    }
  })

  const isValidValue = useCallback(
    function (value: Value): boolean {
      if (value === EMPTY_STRING || value === null) {
        return true
      }
      for (const menuItem of menuItems) {
        if ('value' in menuItem) {
          if (menuItem.value.toLowerCase().indexOf(value.toLowerCase()) === 0) {
            return true
          }
        }
      }
      return false
    },
    [menuItems]
  )

  const getIdByValue = useCallback(
    function (value: Value): MenuItemId {
      if (value === EMPTY_STRING || value === null) {
        return INVALID_MENU_ITEM_ID
      }
      for (const menuItem of menuItems) {
        if ('value' in menuItem) {
          if (menuItem.value === value) {
            return menuItem.id as MenuItemId
          }
        }
      }
      return INVALID_MENU_ITEM_ID
    },
    [menuItems]
  )

  if (
    filter === true &&
    (isValidValue(committedValue) === false || currentValue !== EMPTY_STRING)
  ) {
    menuItems = menuItems.filter(function (menuItem) {
      if ('value' in menuItem) {
        return (
          menuItem.value.toLowerCase().indexOf(currentValue.toLowerCase()) !==
          -1
        )
      }
      return false
    })
  }

  const findMenuItemById = useCallback(
    function (targetId: MenuItemId): null | TextboxAutocompleteOption {
      const result = menuItems.find(function ({ id }) {
        return id === targetId
      })
      return typeof result === 'undefined' ? null : result
    },
    [menuItems]
  )

  const computeNextId = useCallback(
    function (id: MenuItemId): MenuItemId {
      if (id === INVALID_MENU_ITEM_ID) {
        return menuItems[0].id as MenuItemId
      }
      let foundCurrentMenuItem = false
      let index = -1
      while (index++ < menuItems.length - 1) {
        const menuItem = menuItems[index]
        if ('value' in menuItem) {
          if (foundCurrentMenuItem === true) {
            // We've found the item after the current menu item with a `.value`
            break
          }
          if (menuItem.id === id) {
            foundCurrentMenuItem = true
          }
        }
      }
      if (index === menuItems.length) {
        // Reached the end of `menuItems`
        return getIdByValue(currentValue) === INVALID_MENU_ITEM_ID
          ? INVALID_MENU_ITEM_ID
          : (menuItems[0].id as MenuItemId)
      }
      return menuItems[index].id as MenuItemId
    },
    [currentValue, getIdByValue, menuItems]
  )

  const computePreviousId = useCallback(
    function (id: MenuItemId): MenuItemId {
      if (id === INVALID_MENU_ITEM_ID) {
        return menuItems[menuItems.length - 1].id as MenuItemId
      }
      let foundCurrentMenuItem = false
      let index = menuItems.length
      while (index-- > 0) {
        const menuItem = menuItems[index]
        if ('value' in menuItem) {
          if (foundCurrentMenuItem === true) {
            // We've found the item after the current menu item with a `.value`
            break
          }
          if (menuItem.id === id) {
            foundCurrentMenuItem = true
          }
        }
      }
      if (index === -1) {
        // Reached the beginning of `menuItems`
        return getIdByValue(currentValue) === INVALID_MENU_ITEM_ID
          ? INVALID_MENU_ITEM_ID
          : (menuItems[menuItems.length - 1].id as MenuItemId)
      }
      return menuItems[index].id as MenuItemId
    },
    [currentValue, getIdByValue, menuItems]
  )

  const handleFocus = useCallback(
    function (): void {
      setIsMenuVisible(true)
      if (
        committedValue !== EMPTY_STRING &&
        isValidValue(committedValue) === false
      ) {
        // Copy over `committedValue` to `currentValue`
        setCurrentValue(committedValue as string)
      }
    },
    [committedValue, isValidValue]
  )

  const handleKeyDown = useCallback(
    function (event: KeyboardEvent): void {
      const keyCode = event.keyCode
      if (keyCode === UP_KEY_CODE || keyCode === DOWN_KEY_CODE) {
        event.preventDefault()
        if (menuItems.length === 0) {
          return
        }
        if (isMenuVisible === false) {
          setIsMenuVisible(true)
          return
        }
        const nextId =
          keyCode === UP_KEY_CODE
            ? computePreviousId(selectedId)
            : computeNextId(selectedId)
        shouldSelectAllRef.current = true
        setSelectedId(nextId)
        if (nextId === INVALID_MENU_ITEM_ID) {
          onChange({ [name]: currentValue }, currentValue, name, event)
        } else {
          const menuItem = findMenuItemById(nextId)
          if (menuItem !== null && 'value' in menuItem) {
            const newValue = menuItem.value
            onChange({ [name]: newValue }, newValue, name, event)
          }
        }
        return
      }
      if (
        keyCode === ENTER_KEY_CODE ||
        keyCode === ESCAPE_KEY_CODE ||
        keyCode === TAB_KEY_CODE // Tabbing away from this component
      ) {
        if (keyCode === ENTER_KEY_CODE || keyCode === ESCAPE_KEY_CODE) {
          event.preventDefault()
          event.stopPropagation()
        }
        if (isMenuVisible === false && keyCode === ENTER_KEY_CODE) {
          // Show the menu if it is currently hidden.
          setIsMenuVisible(true)
          return
        }
        if (isMenuVisible === false && keyCode === ESCAPE_KEY_CODE) {
          // Blur the textbox if the menu is currently already hidden.
          if (
            inputElementRef.current === null ||
            typeof inputElementRef.current === 'undefined'
          ) {
            return
          }
          inputElementRef.current.blur()
          return
        }
        shouldSelectAllRef.current = false
        if (
          menuElementRef.current === null ||
          typeof menuElementRef.current === 'undefined'
        ) {
          return
        }
        scrollTopRef.current = menuElementRef.current.scrollTop
        setIsMenuVisible(false)
        return
      }
      if (strict !== true) {
        return
      }
      if (event.ctrlKey === true || event.metaKey === true) {
        return
      }
      if (isKeyCodeCharacterGenerating(event.keyCode) === true) {
        if (
          inputElementRef.current === null ||
          typeof inputElementRef.current === 'undefined'
        ) {
          return
        }
        const nextValue = computeNextValue(inputElementRef.current, event.key)
        if (isValidValue(nextValue) === false) {
          event.preventDefault()
        }
      }
    },
    [
      computeNextId,
      computePreviousId,
      currentValue,
      findMenuItemById,
      isMenuVisible,
      strict,
      isValidValue,
      menuItems.length,
      name,
      onChange,
      selectedId
    ]
  )

  const handleKeyUp = useCallback(
    function (event: KeyboardEvent): void {
      const keyCode = event.keyCode
      if (
        keyCode !== BACKSPACE_KEY_CODE &&
        keyCode !== DELETE_KEY_CODE &&
        isKeyCodeCharacterGenerating(keyCode) === false
      ) {
        return
      }
      if (
        inputElementRef.current === null ||
        typeof inputElementRef.current === 'undefined'
      ) {
        return
      }
      const value = inputElementRef.current.value
      const index = getIdByValue(value)
      setIsMenuVisible(true)
      setSelectedId(index)
      setCurrentValue(value)
      onChange({ [name]: value }, value, name, event)
    },
    [getIdByValue, name, onChange]
  )

  const handleOptionClick = useCallback(
    function (event: MouseEvent): void {
      if (
        menuElementRef.current === null ||
        typeof menuElementRef.current === 'undefined'
      ) {
        return
      }
      scrollTopRef.current = menuElementRef.current.scrollTop
      const id = (event.target as HTMLElement).getAttribute('data-id')
      setSelectedId(id)
      setIsMenuVisible(false)
      const menuItem = findMenuItemById(id)
      setCurrentValue(EMPTY_STRING)
      if (menuItem !== null && 'value' in menuItem) {
        const newValue = menuItem.value
        onChange({ [name]: newValue }, newValue, name, event)
      }
    },
    [findMenuItemById, name, onChange]
  )

  function handlePaste(event: ClipboardEvent): void {
    if (
      inputElementRef.current === null ||
      typeof inputElementRef.current === 'undefined' ||
      event.clipboardData === null
    ) {
      return
    }
    const nextValue = computeNextValue(
      inputElementRef.current,
      event.clipboardData.getData('Text')
    )
    if (isValidValue(nextValue) === false) {
      event.preventDefault()
    }
  }

  // Select the contents of the input whenever `value` changes and if
  // `shouldSelectAllRef` is set to `true`
  useLayoutEffect(
    function (): void {
      if (
        inputElementRef.current === null ||
        typeof inputElementRef.current === 'undefined'
      ) {
        return
      }
      if (shouldSelectAllRef.current === true) {
        shouldSelectAllRef.current = false
        inputElementRef.current.focus()
        inputElementRef.current.select()
      }
    },
    [committedValue]
  )

  // Restore the original menu scroll position and update focus
  useLayoutEffect(
    function (): void {
      if (
        inputElementRef.current === null ||
        typeof inputElementRef.current === 'undefined' ||
        menuElementRef.current === null ||
        typeof menuElementRef.current === 'undefined'
      ) {
        return
      }
      if (isMenuVisible === false) {
        inputElementRef.current.blur()
        setCurrentValue(EMPTY_STRING)
        return
      }
      menuElementRef.current.scrollTop = scrollTopRef.current
      inputElementRef.current.focus()
      inputElementRef.current.select()
    },
    [isMenuVisible]
  )

  // Adjust the menu scroll position so that the selected menu item is always visible
  useLayoutEffect(
    function (): void {
      if (
        menuElementRef.current === null ||
        typeof menuElementRef.current === 'undefined'
      ) {
        return
      }
      if (isMenuVisible === false || menuItems.length === 0) {
        return
      }
      const menuElement = menuElementRef.current
      if (selectedId === INVALID_MENU_ITEM_ID) {
        menuElement.scrollTop = 0
        return
      }
      const selectedElement = Array.prototype.slice
        .call(menuElement.children)
        .find(function (element: HTMLElement) {
          return element.getAttribute('data-id') === `${selectedId}`
        })
      if (typeof selectedElement === 'undefined') {
        return
      }
      if (selectedElement.offsetTop < menuElement.scrollTop) {
        menuElement.scrollTop = selectedElement.offsetTop
        return
      }
      const offsetBottom =
        selectedElement.offsetTop + selectedElement.offsetHeight
      if (offsetBottom > menuElement.scrollTop + menuElement.offsetHeight) {
        menuElement.scrollTop = offsetBottom - menuElement.offsetHeight
      }
    },
    [isMenuVisible, menuItems.length, selectedId]
  )

  // Blur the input and hide the menu if we clicked outside the component
  useLayoutEffect(
    function (): () => void {
      function handleWindowMousedown(event: MouseEvent) {
        if (
          menuElementRef.current === null ||
          typeof menuElementRef.current === 'undefined' ||
          rootElementRef.current === null ||
          typeof rootElementRef.current === 'undefined'
        ) {
          return
        }
        if (
          isMenuVisible === false ||
          rootElementRef.current === event.target ||
          rootElementRef.current.contains(event.target as HTMLElement)
        ) {
          // Exit if we clicked on any DOM element that is part of the component
          return
        }
        scrollTopRef.current = menuElementRef.current.scrollTop
        setIsMenuVisible(false)
      }
      window.addEventListener('mousedown', handleWindowMousedown)
      return function () {
        window.removeEventListener('mousedown', handleWindowMousedown)
      }
    },
    [isMenuVisible]
  )

  useLayoutEffect(
    function (): void {
      if (isValidValue(committedValue) === false) {
        return
      }
      const id = getIdByValue(committedValue)
      setSelectedId(id)
    },
    [committedValue, getIdByValue, isValidValue]
  )

  const hasIcon = typeof icon !== 'undefined'
  return (
    <div
      ref={rootElementRef}
      class={classnames(
        styles.textbox,
        noBorder === true ? styles.noBorder : null,
        hasIcon === true ? styles.hasIcon : null
      )}
    >
      <input
        {...rest}
        ref={inputElementRef}
        class={styles.input}
        data-initial-focus={focused === true}
        disabled={disabled === true}
        name={name}
        onFocus={disabled === true ? undefined : handleFocus}
        onKeyDown={disabled === true ? undefined : handleKeyDown}
        onKeyUp={disabled === true ? undefined : handleKeyUp}
        onPaste={disabled === true ? undefined : handlePaste}
        placeholder={placeholder}
        tabIndex={disabled === true ? undefined : 0}
        type="text"
        value={committedValue === null ? '' : committedValue}
      />
      {hasIcon === true ? <div class={styles.icon}>{icon}</div> : null}
      {disabled !== true && isMenuVisible === true && menuItems.length > 0 ? (
        <div
          ref={menuElementRef}
          class={classnames(
            textboxAutocompleteStyles.menu,
            top === true ? textboxAutocompleteStyles.top : null,
            hasIcon === true ? textboxAutocompleteStyles.hasIcon : null
          )}
        >
          {menuItems.map(function (menuItem) {
            if ('separator' in menuItem) {
              return (
                <hr
                  key={menuItem.id}
                  class={textboxAutocompleteStyles.menuSeparator}
                />
              )
            }
            if ('header' in menuItem) {
              return (
                <h1
                  key={menuItem.id}
                  class={textboxAutocompleteStyles.menuHeader}
                >
                  {menuItem.header}
                </h1>
              )
            }
            return (
              <div
                key={menuItem.id}
                class={classnames(
                  textboxAutocompleteStyles.menuItem,
                  menuItem.id === selectedId
                    ? textboxAutocompleteStyles.menuItemSelected
                    : null
                )}
                data-id={menuItem.id}
                onClick={handleOptionClick}
              >
                {menuItem.value}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
