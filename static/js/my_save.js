
    Vue.component("my-modal", {
    template: `
        <div class="modal is-active">
            <div class="modal-background">
            </div>
            <div class="modal-content">
                <div class="box">
                    <slot></slot>
                </div>
            </div>
            <button class="modal-close" @click="$emit('close')">
            </button>
        </div>
    `
    });
  
    Vue.component("chatbox", {
    props: {
      sender: Number,
      receiver: String,
      receiver_id: Number
    },
    template: `          
      <div>
        <h1 class="title">{{ receiver }}</h1> 
        </textarea>
        <div class="box" :message="messages">
          <p class="has-text-right has-text-link is-size-6" v-if="sender==messages[0].sender && messages.content!==undefined">
            {{messages[0].content}}
          </p>
          <p class="has-text-left has-text-grey-dark is-size-6" v-else-if="sender!=messages[0].sender && messages.content!==undefined">
            {{messages[0].content}}
          </p>
          <p class="has-text-right has-text-link is-size-6" v-if="sender!=messages[0].sender && messages.content!==undefined">
            {{messages[1].content}}
          </p>
        </div> 
        <span>
            <textarea class="textarea" rows="1" placeholder="Type a message..." v-model="messages.content" v-if="clear">
            </textarea>
            <br>
            <button class="button is-info" @click="save_msg(receiver_id)">
                <span>Send</span>
                <span class="icon is-small">
                    <i class="far fa-paper-plane"></i>
                </span>
            </button>
        </span>
      </div>
    `,
    data: function() {
      return {
        clear: true,
        messages: [
          {
            content: "",
            sender: "",
            receiver: "",
            timestamp: ""
          }
        ]
      };
    },
    created() {
      setInterval(this.getNow, 1000);
    },
    methods: {
      save_msg: function(receiver_id) {
        this.messages.receiver = receiver_id;
        this.messages.sender = this.sender;
        setInterval(() => {
          this.getNow();
        }, 1000);
        this.messages.push({
          sender: this.messages.sender,
          receiver: this.messages.receiver,
          content: this.messages.content,
          timestamp: this.messages.timestamp
        });
        axios.post(save_msg_url, {
          sender: this.messages.sender,
          receiver: this.messages.receiver,
          content: this.messages.content,
          timestamp: this.messages.timestamp
        });
        this.clear = false;
        this.$nextTick(() => {
          this.messages.content = "";
          this.clear = true;
        });
        this.fetchMessages();
      },
      getNow: function() {
        const today = new Date();
        const date =
          today.getFullYear() +
          "-" +
          (today.getMonth() + 1) +
          "-" +
          today.getDate();
        const time =
          today.getHours() +
          ":" +
          today.getMinutes() +
          ":" +
          today.getSeconds();
        const dateTime = date + " " + time;
        this.messages.timestamp = dateTime;
      },
      fetchMessages: function() {
        axios
          .get(fetch_msg_url, {
            params: {
              sender: this.messages.sender,
              receiver: this.messages.receiver
            }
          })
          .then(result => {
            for (let i = 0; i < result.data.msgs.length; i++) {
              this.$set(this.messages, i, {
                sender: result.data.msgs[i].sender,
                receiver: result.data.msgs[i].receiver,
                content: result.data.msgs[i].content,
                timestamp: result.data.msgs[i].timestamp
              });
            }
          });
      }
    }
  });
