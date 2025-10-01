import os
from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    # Get the absolute path to the index.html file
    file_path = os.path.abspath("index.html")
    page.goto(f"file://{file_path}")

    # --- THE CRITICAL FIX ---
    # First, wait for the initial data to load by checking for a verse.
    # This ensures currentSurahData is populated before we do anything else.
    expect(page.locator("#surah-container .verse-block").first).to_be_visible(timeout=30000)

    # --- Now, proceed with the test ---
    # Click on the "Custom Games" tab
    custom_games_tab = page.get_by_role("button", name="ألعاب مخصصة")
    expect(custom_games_tab).to_be_visible()
    custom_games_tab.click()

    # Wait for the game cards to be populated and visible
    first_game_card = page.locator(".game-card").first
    expect(first_game_card).to_be_visible(timeout=10000)

    # Click on the card matching game
    card_matching_card = page.locator(".game-card").filter(has_text="لعبة مطابقة البطاقات")
    expect(card_matching_card).to_be_visible()
    card_matching_card.click()

    # Wait for the setup screen to be visible
    setup_screen = page.locator(".cm-setup-screen")
    expect(setup_screen).to_be_visible()

    # Select the "Sea" theme, as it has nice animated bubbles
    theme_select = page.locator("select[id^='cm-theme-select-']")
    theme_select.select_option("sea")

    # Start the game
    start_button = page.get_by_role("button", name="ابدأ اللعب")
    start_button.click()

    # Wait for the game board to be visible
    game_board = page.locator(".cm-game-board")
    expect(game_board).to_be_visible()

    # Wait for an animated bubble to appear to ensure the theme is loaded
    expect(page.locator(".bubble").first).to_be_visible()

    # Flip a card to show the new card back design
    card = page.locator(".cm-card").first
    card.click()

    # Wait for the flip animation to complete
    expect(card).to_have_class("cm-card flipped")

    # Take the screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    run_verification(page)
    browser.close()