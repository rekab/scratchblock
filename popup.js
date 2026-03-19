/*
  ==========================================
  popup.js - The Brains of the Popup!
  ==========================================

  This file makes the popup actually DO things.
  It handles:
    - Adding a username to the blocked list
    - Removing a username from the blocked list
    - Saving the list so it remembers who you blocked
    - Showing the list on screen

  HOW IT WORKS:
    We save a list of blocked usernames using Chrome's "storage" API.
    Think of it like a save file in a video game — even if you close
    the browser, your blocked list is still there when you come back!
*/

// ============================================
// STEP 1: Grab all the HTML elements we need
// ============================================

// The text box where you type a username
const usernameInput = document.getElementById("username-input");

// The orange "Block" button
const blockButton = document.getElementById("block-button");

// Where we show short messages like "User blocked!" or errors
const statusMessage = document.getElementById("status-message");

// The <ul> list where blocked usernames appear
const blockedList = document.getElementById("blocked-list");

// The "No users blocked yet" paragraph
const emptyMessage = document.getElementById("empty-message");


// ============================================
// STEP 2: Load the blocked list when the popup opens
// ============================================

// As soon as the popup opens, load the saved list and show it
loadBlockedUsers();


// ============================================
// STEP 3: Listen for clicks and key presses
// ============================================

// When someone clicks the "Block" button, add the user
blockButton.addEventListener("click", function () {
  addBlockedUser();
});

// Also let them press Enter instead of clicking
usernameInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    addBlockedUser();
  }
});


// ============================================
// STEP 4: The functions that do the real work
// ============================================

/**
 * loadBlockedUsers()
 *
 * Reads the saved block list from Chrome's storage
 * and shows each username on screen.
 *
 * This is called when the popup first opens.
 */
function loadBlockedUsers() {
  // Ask Chrome for our saved "blockedUsers" list
  chrome.storage.sync.get({ blockedUsers: [] }, function (data) {
    // data.blockedUsers is an array like ["baduser1", "baduser2"]
    showBlockedList(data.blockedUsers);
  });
}


/**
 * addBlockedUser()
 *
 * Takes whatever is typed in the input box,
 * cleans it up, and adds it to the blocked list.
 */
function addBlockedUser() {
  // Get the text from the input box
  let username = usernameInput.value;

  // Remove extra spaces from the beginning and end
  username = username.trim();

  // Convert to lowercase so "CoolKid" and "coolkid" are treated the same
  username = username.toLowerCase();

  // Make sure they actually typed something
  if (username === "") {
    showStatus("Please type a username first!", "red");
    return; // Stop here, don't add an empty name
  }

  // Load the current list, add the new user, then save
  chrome.storage.sync.get({ blockedUsers: [] }, function (data) {
    // Get the current list
    const blockedUsers = data.blockedUsers;

    // Check if this user is already blocked
    if (blockedUsers.includes(username)) {
      showStatus("That user is already blocked!", "orange");
      return; // Stop here, no need to add them twice
    }

    // Add the new username to the list
    blockedUsers.push(username);

    // Save the updated list back to Chrome's storage
    chrome.storage.sync.set({ blockedUsers: blockedUsers }, function () {
      // Clear the input box
      usernameInput.value = "";

      // Show a success message
      showStatus("Blocked " + username + "!", "green");

      // Refresh the list on screen
      showBlockedList(blockedUsers);

      // Tell any open Scratch tabs to re-hide things
      notifyScratchTabs();
    });
  });
}


/**
 * removeBlockedUser(username)
 *
 * Removes a username from the blocked list.
 * Called when you click the "Unblock" button next to a name.
 */
function removeBlockedUser(username) {
  chrome.storage.sync.get({ blockedUsers: [] }, function (data) {
    // Get the current list
    let blockedUsers = data.blockedUsers;

    // Filter out the username we want to remove
    // This creates a NEW list with everyone EXCEPT the unblocked user
    blockedUsers = blockedUsers.filter(function (name) {
      return name !== username;
    });

    // Save the shorter list
    chrome.storage.sync.set({ blockedUsers: blockedUsers }, function () {
      // Show a message
      showStatus("Unblocked " + username + "!", "green");

      // Refresh the list on screen
      showBlockedList(blockedUsers);

      // Tell any open Scratch tabs to show that user again
      notifyScratchTabs();
    });
  });
}


/**
 * showBlockedList(users)
 *
 * Takes an array of usernames and shows them
 * as a nice list in the popup.
 *
 * Example: if users = ["meanuser", "spammer"],
 * it creates two list items with Unblock buttons.
 */
function showBlockedList(users) {
  // Clear out the old list
  blockedList.innerHTML = "";

  // If nobody is blocked, show the "No users blocked" message
  if (users.length === 0) {
    emptyMessage.style.display = "block";
    return;
  }

  // Hide the "no users" message since we have some
  emptyMessage.style.display = "none";

  // Create a list item for each blocked user
  users.forEach(function (username) {
    // Create a new <li> element
    const listItem = document.createElement("li");

    // Create a <span> for the username text
    const nameSpan = document.createElement("span");
    nameSpan.textContent = username;

    // Create the "Unblock" button
    const unblockBtn = document.createElement("button");
    unblockBtn.textContent = "Unblock";
    unblockBtn.className = "unblock-button";

    // When clicked, remove this user from the list
    unblockBtn.addEventListener("click", function () {
      removeBlockedUser(username);
    });

    // Put the name and button inside the list item
    listItem.appendChild(nameSpan);
    listItem.appendChild(unblockBtn);

    // Add the list item to the <ul>
    blockedList.appendChild(listItem);
  });
}


/**
 * showStatus(message, color)
 *
 * Shows a short message below the input box.
 * It disappears after 3 seconds.
 *
 * Examples:
 *   showStatus("User blocked!", "green")
 *   showStatus("Please type a username!", "red")
 */
function showStatus(message, color) {
  statusMessage.textContent = message;
  statusMessage.style.color = color;

  // Make the message disappear after 3 seconds (3000 milliseconds)
  setTimeout(function () {
    statusMessage.textContent = "";
  }, 3000);
}


/**
 * notifyScratchTabs()
 *
 * Tells any open Scratch tabs to update right now.
 * This way, if you block someone while looking at their
 * comment, it disappears immediately!
 */
function notifyScratchTabs() {
  // Find all tabs that are on scratch.mit.edu
  chrome.tabs.query({ url: "https://scratch.mit.edu/*" }, function (tabs) {
    // Send a message to each Scratch tab
    tabs.forEach(function (tab) {
      chrome.tabs.sendMessage(tab.id, { action: "updateBlockedUsers" });
    });
  });
}
