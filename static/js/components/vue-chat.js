Vue.component('chat', {
    props: ['ticket_url', 'contacts_url', 'messages_url'],
    data: function () {
        return {
           is_open: false,
           is_contacts: true,
           interlocutor: "",
           text_input: "",
           current_contact: 1,
           are_messages_blocked: true,
           client_ticket: null,
           client_ticket_id: null,
           ws: null,
           messages: [], // {content, is_me, timestamp}
           contacts: [], // {id, name}
        }
    },
    mounted: function () {
        console.log("init is working");
        if (!window.WebSocket) {
            if (window.MozWebSocket) {
                window.WebSocket = window.MozWebSocket;
            } else {
                console.log("Browser does not support websockets");
            }
        }
    },
    methods: {
        scroll_to_bottom: function() {
            let element = this.$el.querySelector("#secrect");
            this.$nextTick(() => {
                this.$refs.secret.backgroundColor =  "red";
                this.$refs.secret.scrollTop = 
                    this.$refs.secret.scrollHeight;
            });
        },
        open_a_contact: function (_contact_id) {
            this.is_contacts = false;
            this.current_contact = _contact_id;
            for( let i = 0; i < this.contacts.length; i++ ) {
                if( _contact_id === this.contacts[i].id ) {
                    this.interlocutor = this.contacts[i].name;
                    break;
                }
            }
            this.close_contacts();
            this.load_chat(_contact_id);
            let generate_ticket_url = this.ticket_url;
            axios.get(generate_ticket_url)
                 .then( (res) => {
                         this.client_ticket = res.data.ticket;
                         this.client_ticket_id = res.data.ticket_id;
                         this.ws = new WebSocket('ws://127.0.0.1:8000/cine/chatsocket');
                         this.ws.onopen = this.onopen_handler;
                         this.ws.onmessage = this.onmessage_handler;
                     }
                 );
        },
        onopen_handler: function (evt) {
            this.ws.send(
                JSON.stringify(
                    {
                        'content': this.client_ticket,
                        'ticket_id': this.client_ticket_id
                    }
                )
            );
        },
        onmessage_handler: function (evt) {
            let serialized_payload = JSON.parse(evt.data);
            let msg = serialized_payload.message;
            let recipient_id = serialized_payload.recipient_id;
            let ts = serialized_payload.ts;
            this.messages.push(
                {
                    "content": msg,  
                    "recipient_id": recipient_id,
                    "timestamp": ts
                }
            );
            this.scroll_to_bottom();
        },
        back_out_of_contact: function () {
            this.is_contacts = true;
            this.close_chat();
            this.load_contacts();
            this.ws.close();
        },
        open: function () {
            this.is_contacts = true;
            this.is_open = true;
            this.load_contacts();
        },
        close: function () {
            this.is_open = false;
            this.close_contacts();
        },
        load_contacts: function() {
            let load_contacts_url = this.contacts_url;
            axios.get(load_contacts_url)
                 .then( (res) => {
                         console.log("===> load_contacts:", res.data.contacts);
                         this.contacts = res.data.contacts;
                     }
                 );
        },
        load_chat: function(_contacts_id) {
            let load_messages_url = this.messages_url + "/" + String(_contacts_id);
            axios.get(load_messages_url)
                 .then( (res) => {
                         this.messages = res.data.messages;
                         this.are_messages_blocked = false;
                         this.scroll_to_bottom();
                     }
                 );
        },
        close_contacts: function() {
            console.log("close contacts");
        },
        close_chat: function() {
            console.log("close chat");
            this.are_messages_blocked = true;
            this.ws.close();
        },
        send_message: function() {
            if( this.are_messages_blocked ) {
                return false;
            }
            let recipient_id = this.current_contact;
            let content = this.text_input;
            let payload = JSON.stringify(
                {
                    "recipient_id": recipient_id,
                    "content": content,
                }
            );
            this.text_input = "";
            this.ws.send(payload);
            return true;
        }
    },
    template: '\
<div>\
    <div class="open-button" @click="open">Chat 	&#9650;\
    </div>\
    <div v-if="is_open"\
         class="chat-popup"\
         id="chat-window"\
         @keydown.enter="send_message">\
        <div v-show="is_contacts"\
             class="chat-container">\
            <div class="top-chat-bar">\
                <div class="chat-title">\
                    Contacts\
                </div>\
                <div class="close-button"\
                    @click="close">\
                    &#9662;\
                </div>\
            </div>\
            <div class="chat-center-area">\
                <div v-for="contact in contacts"\
                     @click="open_a_contact(contact.id)"\
                     class="contact">\
                    {{contact.name}}\
                </div>\
            </div>\
        </div>\
        <div v-show="!is_contacts" class="chat-container">\
            <div class="top-chat-bar">\
                <div class="back-button"\
                     @click="back_out_of_contact">\
                    &#9664;\
                </div>\
                <div class="chat-title">\
                    {{interlocutor}}\
                </div>\
                <div class="close-button"\
                    @click="close">\
                    &#9662;\
                </div>\
            </div>\
            <div class="chat-center-area"\
                 id="secret"\
                 ref="secret">\
                <div v-for="message in messages">\
                    <div v-if="message.recipient_id !== current_contact"\
                         class="message-from-me">\
                        {{message.content}}\
                    </div>\
                    <div v-else class="message-from-other">\
                        {{message.content}}\
                    </div>\
                </div>\
            </div>\
            <div class="input-area">\
                <input v-model="text_input" class="chat-input"></input>\
                <div @click="send_message()"\
                     class="send-button">\
                    send\
                </div>\
            </div>\
        </div>\
    </div>\
</div>\
'
})
