// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>
      drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>
      visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>
    }
  }
}

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('[data-cy=email]').type(email)
  cy.get('[data-cy=password]').type(password)
  cy.get('[data-cy=submit]').click()
})

Cypress.Commands.add('drag', { prevSubject: 'element' }, (subject, options) => {
  cy.wrap(subject).trigger('mousedown', { button: 0 })
  cy.get('body').trigger('mousemove', { clientX: 100, clientY: 100 })
  cy.get('body').trigger('mouseup')
})

Cypress.Commands.add('dismiss', { prevSubject: 'element' }, (subject, options) => {
  cy.wrap(subject).click()
})