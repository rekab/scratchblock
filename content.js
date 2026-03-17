/*
  ==========================================
  content.js - The Comment & User Hider!
  ==========================================

  This file runs on every scratch.mit.edu page.
  It looks through the page for usernames that
  match your blocked list, and hides their stuff.

  WHAT IT HIDES:
    - Comments made by blocked users
    - Projects made by blocked users (in galleries/search)
    - Profile links and user mentions

  HOW IT WORKS:
    1. When the page loads, it reads your blocked list
    2. It scans the page for anything by blocked users
    3. It hides those things by adding a CSS class
    4. It keeps watching for NEW content (because Scratch
       loads comments dynamically as you scroll)

  SCRATCH PAGE STRUCTURE (how Scratch builds its pages):
    - Comments live inside elements with class "comment"
    - Each comment has a link with class "username"
    - That link goes to "/users/THEIRUSERNAME"
    - Projects in galleries have links to "/users/..." too
    - User profile pages have the username in the URL
*/


// ============================================
// STEP 1: Keep a list of blocked usernames in memory
// ============================================

// This variable holds the blocked usernames so we
// don't have to keep asking Chrome's storage
let blockedUsers = [];


// ============================================
// STEP 2: Load the blocked list, then start hiding
// ============================================

// Load the list from storage
chrome.storage.sync.get({ blockedUsers: [] }, function (data) {
  blockedUsers = data.blockedUsers;

  // Now that we have the list, hide stuff on the page
  hideBlockedContent();

  // Start watching for new content that loads later
  startWatching();
});


// ============================================
// STEP 3: Listen for messages from the popup
// ============================================

// When you block/unblock someone in the popup, it sends
// a message here so we can update the page right away
chrome.runtime.onMessage.addListener(function (message) {
  if (message.action === "updateBlockedUsers") {
    // Reload the list and re-scan the page
    chrome.storage.sync.get({ blockedUsers: [] }, function (data) {
      blockedUsers = data.blockedUsers;
      hideBlockedContent();
    });
  }
});


// ============================================
// STEP 4: The main function that hides things
// ============================================

/**
 * hideBlockedContent()
 *
 * Scans the ENTIRE page for content by blocked users
 * and hides it. This is called:
 *   - When the page first loads
 *   - When you block/unblock someone
 *   - When new content appears (like loading more comments)
 */
function hideBlockedContent() {
  // If nobody is blocked, make sure nothing is hidden
  if (blockedUsers.length === 0) {
    unhideEverything();
    return;
  }

  // --- HIDE COMMENTS ---
  hideBlockedComments();

  // --- HIDE PROJECTS IN LISTS ---
  hideBlockedProjects();

  // --- HIDE FORUM POSTS ---
  hideBlockedForumPosts();

  // --- REDIRECT AWAY FROM BLOCKED PROFILES ---
  checkIfOnBlockedProfile();
}


// ============================================
// STEP 5: Hide comments by blocked users
// ============================================

/**
 * hideBlockedComments()
 *
 * Finds all comments on the page and checks who wrote them.
 * If the author is blocked, the whole comment disappears.
 *
 * HOW SCRATCH COMMENTS LOOK IN THE HTML:
 *
 *   <div class="flex-row comment">          <-- the comment box
 *     <a href="/users/SomeUser">            <-- link to profile
 *       <img class="avatar" ...>            <-- their picture
 *     </a>
 *     <div class="comment-body">
 *       <a class="username" href="/users/SomeUser">
 *         SomeUser                           <-- their name
 *       </a>
 *       <div class="comment-bubble">
 *         <span class="comment-content">
 *           their message here...            <-- what they said
 *         </span>
 *       </div>
 *     </div>
 *   </div>
 */
function hideBlockedComments() {
  // Find every username link inside comments
  const usernameLinks = document.querySelectorAll(".comment a.username");

  usernameLinks.forEach(function (link) {
    // Get the username from the link text
    const username = link.textContent.trim().replace("*", "").toLowerCase();

    // Find the parent comment container
    // We go up the DOM tree to find the element with class "comment"
    const commentElement = findParentWithClass(link, "comment");

    if (commentElement) {
      if (blockedUsers.includes(username)) {
        // This user is blocked — hide the comment!
        commentElement.classList.add("scratch-blocked-hidden");
      } else {
        // This user is NOT blocked — make sure it's visible
        commentElement.classList.remove("scratch-blocked-hidden");
      }
    }
  });
}


// ============================================
// STEP 6: Hide projects by blocked users
// ============================================

/**
 * hideBlockedProjects()
 *
 * On pages like the Explore page or a studio page,
 * projects are shown in a grid. Each project card
 * has a link to the author's profile.
 *
 * This function finds those cards and hides any
 * that belong to blocked users.
 *
 * HOW PROJECT CARDS LOOK:
 *
 *   <li class="thumbnail ...">               <-- the project card
 *     <a href="/projects/12345">
 *       <img src="thumbnail.png">            <-- the preview image
 *     </a>
 *     <span class="thumbnail-creator">
 *       <a href="/users/SomeUser">SomeUser</a>  <-- the author
 *     </span>
 *   </li>
 */
function hideBlockedProjects() {
  // Find elements that show who made a project
  const creatorLinks = document.querySelectorAll(
    ".thumbnail-creator a, " +     // project thumbnails
    ".studio-member-tile a, " +     // studio member lists
    ".user-projects-container a"    // user project grids
  );

  creatorLinks.forEach(function (link) {
    // Get the username from the link's href
    const username = getUsernameFromLink(link);

    if (username && blockedUsers.includes(username)) {
      // Find the project card container and hide it
      const card = findParentWithClass(link, "thumbnail") ||
                   findParentWithClass(link, "studio-member-tile");

      if (card) {
        card.classList.add("scratch-blocked-hidden");
      }
    } else if (username) {
      // Make sure non-blocked cards are visible
      const card = findParentWithClass(link, "thumbnail") ||
                   findParentWithClass(link, "studio-member-tile");

      if (card) {
        card.classList.remove("scratch-blocked-hidden");
      }
    }
  });
}


// ============================================
// STEP 7: Hide forum posts by blocked users
// ============================================

/**
 * hideBlockedForumPosts()
 *
 * The Scratch discussion forums have a different layout.
 * Each post has the author's name in a sidebar.
 *
 * HOW FORUM POSTS LOOK:
 *
 *   <div class="blockpost">
 *     <div class="box">
 *       <div class="postleft">
 *         <dl>
 *           <dt><a href="/users/SomeUser">SomeUser</a></dt>
 *         </dl>
 *       </div>
 *       <div class="postright">
 *         ... the post content ...
 *       </div>
 *     </div>
 *   </div>
 */
function hideBlockedForumPosts() {
  // Forum post author links are inside the "postleft" section
  const postAuthors = document.querySelectorAll(".postleft dt a");

  postAuthors.forEach(function (link) {
    const username = link.textContent.trim().toLowerCase();

    // Find the whole forum post container
    const post = findParentWithClass(link, "blockpost");

    if (post) {
      if (blockedUsers.includes(username)) {
        post.classList.add("scratch-blocked-hidden");
      } else {
        post.classList.remove("scratch-blocked-hidden");
      }
    }
  });
}


// ============================================
// STEP 8: Redirect away from a blocked user's profile
// ============================================

/**
 * checkIfOnBlockedProfile()
 *
 * If you somehow end up on a blocked user's profile page,
 * we show a warning banner at the top so you know they're blocked.
 *
 * Profile URLs look like: https://scratch.mit.edu/users/SomeUser/
 */
function checkIfOnBlockedProfile() {
  // Check if we're on a user profile page
  // The URL pattern is: /users/USERNAME or /users/USERNAME/
  const match = window.location.pathname.match(/^\/users\/([^/]+)/);

  if (match) {
    // Get the username from the URL
    const profileUser = match[1].toLowerCase();

    if (blockedUsers.includes(profileUser)) {
      // We're on a blocked user's profile! Show a warning.
      showBlockedBanner(profileUser);
    } else {
      // Remove the banner if this user isn't blocked
      removeBlockedBanner();
    }
  }
}


// ============================================
// STEP 9: The blocked-profile warning banner
// ============================================

/**
 * showBlockedBanner(username)
 *
 * Puts a big orange bar at the top of the page that says
 * "This user is on your block list."
 */
function showBlockedBanner(username) {
  // Don't add a second banner if one already exists
  if (document.getElementById("scratch-blocker-banner")) {
    return;
  }

  // Create the banner element
  const banner = document.createElement("div");
  banner.id = "scratch-blocker-banner";
  banner.textContent =
    "Heads up! \"" + username + "\" is on your block list. " +
    "Their comments are hidden on other pages.";

  // Add it to the very top of the page
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * removeBlockedBanner()
 *
 * Removes the warning banner if it exists.
 */
function removeBlockedBanner() {
  const banner = document.getElementById("scratch-blocker-banner");
  if (banner) {
    banner.remove();
  }
}


// ============================================
// STEP 10: Watch for new content loading
// ============================================

/**
 * startWatching()
 *
 * Scratch loads content dynamically — for example,
 * when you click "Load more comments" or scroll down.
 *
 * A MutationObserver watches the page for changes.
 * Whenever new HTML elements appear, we re-scan
 * the page to hide anything from blocked users.
 *
 * Think of it like a security guard watching a door:
 * every time someone new walks in, the guard checks
 * if they're on the "not allowed" list.
 */
function startWatching() {
  // Create the "observer" (the security guard)
  const observer = new MutationObserver(function (mutations) {
    // Something changed on the page!
    // Let's check if any new comments or projects appeared

    let shouldRescan = false;

    mutations.forEach(function (mutation) {
      // We only care about new elements being added
      if (mutation.addedNodes.length > 0) {
        shouldRescan = true;
      }
    });

    if (shouldRescan) {
      // New stuff appeared — hide any blocked content
      hideBlockedContent();
    }
  });

  // Tell the observer to watch the entire page
  // "childList: true" = watch for new elements
  // "subtree: true" = watch INSIDE elements too, not just the top level
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}


// ============================================
// STEP 11: Helper functions (useful tools!)
// ============================================

/**
 * findParentWithClass(element, className)
 *
 * Walks UP the HTML tree from an element until it finds
 * a parent that has a specific class name.
 *
 * Example: if you have a <a> inside a <div class="comment">,
 * calling findParentWithClass(theLink, "comment")
 * returns the <div>.
 *
 * It's like being in a room and asking "which building am I in?"
 * — you go up from room -> floor -> building.
 */
function findParentWithClass(element, className) {
  // Start with the element's parent
  let current = element.parentElement;

  // Keep going up until we find it or run out of parents
  while (current) {
    if (current.classList && current.classList.contains(className)) {
      // Found it!
      return current;
    }
    // Move up one level
    current = current.parentElement;
  }

  // Didn't find it
  return null;
}


/**
 * getUsernameFromLink(linkElement)
 *
 * Takes a link element like <a href="/users/CoolPerson">
 * and returns just the username part: "coolperson"
 *
 * Returns null if the link doesn't go to a user profile.
 */
function getUsernameFromLink(linkElement) {
  const href = linkElement.getAttribute("href");

  if (!href) {
    return null;
  }

  // Try to match the pattern "/users/USERNAME"
  const match = href.match(/\/users\/([^/]+)/);

  if (match) {
    // Return the username in lowercase
    return match[1].toLowerCase();
  }

  return null;
}


/**
 * unhideEverything()
 *
 * Removes the hidden class from ALL elements.
 * Called when the block list becomes empty (everyone unblocked).
 */
function unhideEverything() {
  const hiddenElements = document.querySelectorAll(".scratch-blocked-hidden");

  hiddenElements.forEach(function (element) {
    element.classList.remove("scratch-blocked-hidden");
  });

  removeBlockedBanner();
}
