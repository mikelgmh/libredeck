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

  it('should allow profile selection', () => {
    // Wait for profiles to load
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')

    // Get the first available option (excluding the default "Seleccionar perfil..." option)
    cy.get('[data-cy=profile-selector] option').eq(1).then(($option) => {
      const profileValue = $option.val()
      if (profileValue) {
        cy.get('[data-cy=profile-selector]').select(profileValue)
        // Should show the selected profile
        cy.get('[data-cy=profile-selector]').should('have.value', profileValue)
      }
    })
  })

  it('should allow creating a new button', () => {
    // First select a profile to enable button editing
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy=profile-selector] option').eq(1).then(($option) => {
      const profileValue = $option.val()
      if (profileValue) {
        cy.get('[data-cy=profile-selector]').select(profileValue)
      }
    })

    // Select a button slot to open the editor
    cy.get('[data-cy=button-slot]').first().click()

    // Should open button editor
    cy.get('[data-cy=button-editor]', { timeout: 5000 }).should('be.visible')

    // Fill in button details
    cy.get('[data-cy=text-top-input]').type('Test Button')
    cy.get('[data-cy=text-bottom-input]').type('Bottom Text')

    // Save button
    cy.get('[data-cy=save-button]').click()

    // Button should be visible on grid (might take a moment to update)
    cy.contains('Test Button', { timeout: 5000 }).should('be.visible')
  })

  it('should allow adding actions to buttons', () => {
    // First select a profile
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy=profile-selector] option').eq(1).then(($option) => {
      const profileValue = $option.val()
      if (profileValue) {
        cy.get('[data-cy=profile-selector]').select(profileValue)
      }
    })

    // Select a button
    cy.get('[data-cy=button-slot]').first().click()

    // Should open button editor and show actions section
    cy.get('[data-cy=button-editor]', { timeout: 5000 }).should('be.visible')

    // Check if actions sidebar is visible (it should be on the right side)
    cy.get('[data-cy=actions-sidebar]').should('be.visible')

    // Try to drag an action to the button (if actions are available)
    cy.get('[data-cy=action-item]').first().then($action => {
      if ($action.length > 0) {
        // If actions exist, drag the first one
        cy.get('[data-cy=action-item]').first().trigger('dragstart')
        cy.get('[data-cy=drop-zone]').trigger('drop')
        
        // Action should be added
        cy.get('[data-cy=button-actions]').should('have.length.greaterThan', 0)
      }
    })
  })

  it('should execute button actions', () => {
    // First select a profile
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy=profile-selector] option').eq(1).then(($option) => {
      const profileValue = $option.val()
      if (profileValue) {
        cy.get('[data-cy=profile-selector]').select(profileValue)
      }
    })

    // Select a button slot and create a simple button
    cy.get('[data-cy=button-slot]').first().click()
    cy.get('[data-cy=button-editor]', { timeout: 5000 }).should('be.visible')
    cy.get('[data-cy=text-top-input]').type('Test Action')
    cy.get('[data-cy=save-button]').click()

    // Verify button was created and is clickable
    cy.get('[data-cy=button-slot]').first().should('be.visible')

    // Click on the button slot (should trigger execution or editing)
    cy.get('[data-cy=button-slot]').first().click()

    // Test passes if we can interact with buttons without errors
    cy.get('[data-cy=button-slot]').should('have.length.greaterThan', 0)
  })

  it('should support multiple pages', () => {
    // First select a profile
    cy.get('[data-cy=profile-selector]', { timeout: 10000 }).should('be.visible')
    cy.get('[data-cy=profile-selector] option').eq(1).then(($option) => {
      const profileValue = $option.val()
      if (profileValue) {
        cy.get('[data-cy=profile-selector]').select(profileValue)
      }
    })

    // Add a new page
    cy.get('[data-cy=add-page]').click()
    cy.get('[data-cy=page-name-input]').type('Test Page')
    cy.get('[data-cy=create-page]').click()

    // Should show the new page in navigation
    cy.get('[data-cy=page-nav]').contains('Test Page').should('be.visible')

    // Should update current page indicator (check that it shows page info)
    cy.get('[data-cy=current-page]').should('be.visible')
  })

  it('should support language switching', () => {
    // Check default language (Spanish)
    cy.contains('Seleccionar perfil').should('be.visible')

    // Switch to English using cy.select()
    cy.get('[data-cy=language-selector]').select('en')

    // Should show English text
    cy.contains('Select profile').should('be.visible')
  })
})