var posts = [];
var search = null;

/*
 * Hides the main part of the page to show the Ask a Question section
 */
function showAsk() {
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    if (main) main.style.display = "none";
    if (ask) ask.style.display = "block";
}

/*
 * Hides the Ask a Question section of the page to show the main part,
 * clearing the question input fields.
 */
function showMain() {
    var main = document.getElementById("main");
    var ask = document.getElementById("ask");
    if (ask) ask.style.display = "none";
    if (main) main.style.display = "block";

    // Check if elements exist before setting value
    const postTitle = document.getElementById('post-title');
    const postContent = document.getElementById('post-content');
    const postTags = document.getElementById('post-tags');

    if (postTitle) postTitle.value = '';
    if (postContent) postContent.value = '';
    if (postTags) postTags.value = '';
}

/*
 * Creates a new question/post & send it to the server, before triggering an update for the main part of the page.
 */
function createPost() {
    search = null;

    let post = {
        title: document.getElementById('post-title').value,
        content: document.getElementById('post-content').value,
        tags: document.getElementById('post-tags').value.split(" "),
        upvotes: 0
    };

    // Using fetch API for consistency and modern approach
    fetch("/addpost", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(post)
    })
    .then(response => {
        if (response.ok) {
            loadPosts();
            showMain();
        } else {
            console.error('Failed to create post:', response.statusText);
            // Optionally, handle error display
        }
    })
    .catch(error => {
        console.error('Error creating post:', error);
        // Optionally, handle network error
    });
}

/*
 * Updates the search term then reloads the posts shown
 */
function searchPosts() {
    const postSearch = document.getElementById('post-search');
    if (postSearch) {
        search = postSearch.value.toUpperCase();
        updatePosts();
    }
}

/*
 * Reloads the posts shown on the page
 * Iterates over the array of post objects, rendering HTML for each and appending it to the page
 * If a search term is being used
 */
function updatePosts() {
    const postList = document.getElementById('post-list');
    if (!postList) return; // Exit if post-list element doesn't exist

    // Reset the page
    postList.innerHTML = '';

    // Iterate over each post in the array by index
    for (let i = 0; i < posts.length; i++) {
        let post = posts[i];

        // Check if a search term used.
        if (search !== null) {
            // If so, skip this question/post if title or content doesn't match
            if (post.title.toUpperCase().indexOf(search) < 0 &&
                post.content.toUpperCase().indexOf(search) < 0) {
                continue;
            }
        }

        // Generate a set of spans for each of the tags
        let tagSpans = '';
        for (let tag of post.tags) {
            tagSpans = tagSpans + `<span class="tag">${tag}</span>`;
        }

        // Generate the post/question element and populate its inner HTML
        let postDiv = document.createElement("DIV");
        postDiv.classList.add("post");

        postDiv.innerHTML = `
            <div class="votes">
                <button onclick="upvote(${i})">+</button>
                <p><span class="count">${post.upvotes}</span><br />votes</p>
                <button onclick="downvote(${i})">-</button>
            </div>
            <div class="content">
                <h3><a href="#">${post.title}</a></h3>
                <i>By ${post.author || 'Anonymous'}</i>
                <p>${post.content}</p>
                ${tagSpans}<span class="date">${new Date(post.timestamp).toLocaleString()}</span>
            </div>
        `;

        // Append the question/post to the page
        postList.appendChild(postDiv);
    }
}

/*
 * Loads posts from the server
 * - Send an AJAX GET request to the server
 * - JSON Array of posts sent in response
 * - Update the page
 */
function loadPosts() {
    fetch("/posts")
        .then(response => {
            if (!response.ok) throw new Error('Failed to load posts');
            return response.json();
        })
        .then(data => {
            posts = data;
            updatePosts();
        })
        .catch(error => {
            console.error('Error loading posts:', error);
            // Optionally, display error to user
        });
}

/*
 * Increase the votes for a given post, then update the page
 */
function upvote(index) {
    if (posts[index]) {
        posts[index].upvotes++;
        updatePosts();
    }
}

/*
 * Decrease the votes for a given post, then update the page
 */
function downvote(index) {
    if (posts[index]) {
        posts[index].upvotes--;
        updatePosts();
    }
}

// Corrected login function to use fetch API and error message div
async function login() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorMessageDiv = document.getElementById('error-message');

    // Clear previous error message
    if (errorMessageDiv) errorMessageDiv.textContent = '';

    if (!usernameInput || !passwordInput) {
        console.error("Login form elements not found.");
        if (errorMessageDiv) errorMessageDiv.textContent = "Form elements missing.";
        return;
    }

    let credentials = {
        username: usernameInput.value,
        password: passwordInput.value
    };

    try {
        const response = await fetch("/login", { // Directs to the app.js login route
            method: "POST",
            headers: { "Content-type": "application/json" },
            body: JSON.stringify(credentials)
        });

        // For successful login, app.js performs a redirect.
        // We just need to check if the request was successful and handle potential redirects.
        // If app.js redirects, the browser handles it automatically.
        // If app.js returns JSON for errors, we process that.

        if (response.redirected) {
            // If the server sent a redirect (e.g., to dashboard), let the browser follow
            window.location.href = response.url;
        } else {
            // If the server did not redirect, it likely sent an error JSON
            const result = await response.json(); // Assuming error responses are JSON
            if (errorMessageDiv) {
                errorMessageDiv.textContent = result.error || 'Login failed. Please try again.';
            }
        }
    } catch (error) {
        console.error('Error during login:', error);
        if (errorMessageDiv) {
            errorMessageDiv.textContent = 'An unexpected error occurred. Please try again.';
        }
    }
}


// Corrected logout function to send POST and handle JSON response
async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST', // Changed from GET to POST
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json(); // Expecting JSON response from app.js

        if (response.ok) {
            // Redirect to the login page on successful logout
            window.location.href = '/';
        } else {
            // Log or display an error if logout fails
            console.error('Logout failed:', result.message || response.statusText);
            alert('Logout failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error during logout fetch:', error);
        alert('An error occurred during logout. Please check your network connection.');
    }
}