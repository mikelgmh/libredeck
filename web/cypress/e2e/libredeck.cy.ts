describe('LibreDeck E2E Tests', () => {
  beforeEach(() => {
    // Assuming the daemon is running on port 3001
    // and the frontend on port 4321
    cy.visit('/')
  })

  it('should load the main page', () => {
    cy.contains('LibreDeck').should('be.visible')
  })

  it('should load the application interface', () => {
    // Wait for the app to load
    cy.get('body').should('be.visible')

    // Check for basic UI elements (these will need data-cy attributes later)
    cy.contains('Seleccionar perfil').should('be.visible')
  })

  // TODO: Enable these tests once data-cy attributes are added to components
  it.skip('should allow profile selection', () => {
    // Wait for profiles to load
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')

    // Click on profile selector
    cy.get('[data-cy=profile-selector]').click()

    // Should show profile options
    cy.get('[data-cy=profile-option]').should('have.length.greaterThan', 0)
  })

  it.skip('should allow creating a new button', () => {
    // Select a button slot
    cy.get('[data-cy=button-slot]').first().click()

    // Should open button editor
    cy.get('[data-cy=button-editor]').should('be.visible')

    // Fill in button details
    cy.get('[data-cy=text-top-input]').type('Test Button')
    cy.get('[data-cy=text-bottom-input]').type('Bottom Text')

    // Save button
    cy.get('[data-cy=save-button]').click()

    // Button should be visible on grid
    cy.contains('Test Button').should('be.visible')
  })

  it.skip('should allow adding actions to buttons', () => {
    // Select a button
    cy.get('[data-cy=button-slot]').first().click()

    // Open actions sidebar
    cy.get('[data-cy=actions-sidebar]').should('be.visible')

    // Drag an action to the button
    cy.get('[data-cy=action-item]').first().drag('[data-cy=drop-zone]')

    // Action should be added
    cy.get('[data-cy=button-actions]').should('have.length.greaterThan', 0)
  })

  it.skip('should execute button actions', () => {
    // Create a button with a simple action
    cy.get('[data-cy=button-slot]').first().click()
    cy.get('[data-cy=text-top-input]').type('Execute Test')
    cy.get('[data-cy=save-button]').click()

    // Click the button to execute
    cy.contains('Execute Test').click()

    // Should show execution feedback
    cy.get('[data-cy=execution-feedback]').should('be.visible')
  })

  it.skip('should support multiple pages', () => {
    // Add a new page
    cy.get('[data-cy=add-page]').click()
    cy.get('[data-cy=page-name-input]').type('Test Page')
    cy.get('[data-cy=create-page]').click()

    // Should show the new page
    cy.contains('Test Page').should('be.visible')

    // Navigate between pages
    cy.get('[data-cy=page-nav]').contains('Test Page').click()
    cy.get('[data-cy=current-page]').should('contain', 'Test Page')
  })

  it.skip('should support language switching', () => {
    // Check default language (Spanish)
    cy.contains('Seleccionar perfil').should('be.visible')

    // Switch to English
    cy.get('[data-cy=language-selector]').click()
    cy.get('[data-cy=language-en]').click()

    // Should show English text
    cy.contains('Select profile').should('be.visible')
  })
})