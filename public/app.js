new Vue({
    el: '#app',

    data: {
        ws: null, // Our websocket
        newMsg: '', // Holds new messages to be sent to the server
        chatContent: '', // A running list of chat messages displayed on the screen
        email: null, // Email address used for grabbing an avatar
        username: null, // Our username
        joined: false,  // True if email and username have been filled in
        online: null, // Keeps track of all other people you can communicate with through the system
        recipient: null, //The person you are sending the message to
        conversations:{}, //A list dictionary indexed by the username of anyone you have contacted or that has tried to contact you
        newMessages:{} //A dictionary that keeps track of what online member has tried to contact the user without having their message looked at
    },

    created: function() {
        var self = this;
        this.ws = new WebSocket('ws://' + window.location.host + '/ws');
        this.ws.addEventListener('message', function(e) {
            var msg = JSON.parse(e.data);
            if(Array.isArray(msg)){
                let offline = self.getOfflineFriends(msg);
                self.online = msg;
                if(offline.length > 0){
                    offline.forEach(friend => self.removeOfflineFriend(friend));
                }
            } else {
                if((msg.recipient === self.username && msg.Username === self.recipient) || msg.Username === self.username){
                    self.chatContent += '<div class="chip">'
                    + '<img src="' + self.gravatarURL(msg.email) + '">' // Avatar
                    + msg.Username
                + '</div>'
                + emojione.toImage(msg.message) + '<br/>'; // Parse emojis

                var element = document.getElementById('chat-messages');
                element.scrollTop = element.scrollHeight; // Auto scroll to the bottom

                self.conversations[msg.Username] = self.chatContent;

                } else if(msg.recipient === self.username && msg.Username !== self.recipient){
                    self.newMessages = {...self.newMessages, [msg.Username] : true};
                    let conversation = self.conversations[msg.Username] !== undefined ? self.conversations[msg.Username] : "";
                    conversation += '<div class="chip">'
                    + '<img src="' + self.gravatarURL(msg.email) + '">' // Avatar
                    + msg.Username
                + '</div>'
                + emojione.toImage(msg.message) + '<br/>'; // Parse emojis

                self.conversations[msg.Username] = conversation;
                }
            }
        });
    },

    methods: {
        removeOfflineFriend: function(f) {
            console.log(f);
            if(this.recipient === f){
                console.log("hello")
                this.recipient = "";
                this.chatContent = "";
            }
            if(this.newMessages[f]){
                delete newMessages[f];
            }
        },
        getOfflineFriends: function(currentFriends) {
            let offline = [];
            let online = this.online ? this.online : [];

            online.forEach(friend => {
                if(currentFriends.indexOf(friend) === -1){
                    offline.push(friend)
                }
            });
            return offline;
        },
        send: function () {
            if (this.newMsg != '') {
                this.ws.send(
                    JSON.stringify({
                        email: this.email,
                        username: this.username,
                        message: $('<p>').html(this.newMsg).text(), // Strip out html
                        recipient: this.recipient
                    }
                ));
                this.newMsg = ''; // Reset newMsg
            }
        },

        join: function () {
            if (!this.email) {
                Materialize.toast('You must enter an email', 2000);
                return
            }
            if (!this.username) {
                Materialize.toast('You must choose a username', 2000);
                return
            }
            this.email = $('<p>').html(this.email).text();
            this.username = $('<p>').html(this.username).text();
            this.joined = true;

            this.ws.send(
                JSON.stringify({
                    username: this.username
                })
            )
        },

        openConversation: function (username) {
            if(this.newMessages[username] !== undefined)
                this.newMessages[username] = false
            if(Object.values(this.conversations).indexOf(username) !== -1){
                this.conversations[this.recipient] = this.chatContent;
                this.recipient = username;
                this.chatContent = '';
            } else if(Object.values(this.conversations).indexOf(username) === -1){
                this.conversations[this.recipient] = this.chatContent;
                this.chatContent = this.conversations[username] === undefined ? "" : this.conversations[username];
                this.recipient = username;
            } else {
                this.recipient = username;
                this.conversations[this.recipient] = "";
            }
        },

        gravatarURL: function(email) {
            return 'http://www.gravatar.com/avatar/' + CryptoJS.MD5(email);
        }
    }      
});