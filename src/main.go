package main

import(
	"log"
	"net/http"
	
	"github.com/gorilla/websocket"
)

type Message struct {
	Email 	 string `json:"email"`
	Username string `json:"username`
	Message  string `json:"message"`
	Recipient string `json:"recipient"`
}

var clients = make(map[*websocket.Conn]string)
var broadcast = make(chan Message)
var friendStatusBroadcast = make(chan []string)
var online []string

var upgrader = websocket.Upgrader{}

func filterOutCurrentUser(ufl []string, username string) []string{
	f := []string{}
	for _, e := range ufl{
		if e != username{
			f = append(f, e)
		}
	}
	return f
}

func findElement(slice []string, element string) int{
	for i, e := range slice{
		if e == element{
			return i
		}
	}
	return -1
}

func handleFriendslist(){
	for{
		online := <- friendStatusBroadcast
		for client := range clients {
			filteredOnline := filterOutCurrentUser(online, clients[client])
			err := client.WriteJSON(filteredOnline)
			if err != nil {
				log.Printf("error: %v", err)
				client.Close()
				delete(clients, client)
			}	
		}
	}
	
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil{
		log.Fatal(err)
	}
	defer ws.Close()

	for {
		var msg Message

		err := ws.ReadJSON(&msg)
		if err != nil{
			log.Printf("error;: %v", err)
			clientToDelete := findElement(online, clients[ws])
			online[clientToDelete] = online[len(online) - 1]
			online[len(online) - 1] = ""
			online = online[:len(online)-1]
			friendStatusBroadcast <- online
			delete(clients, ws)
			break
		}

		clients[ws] = msg.Username
		if findElement(online, msg.Username) == -1 && msg.Message == ""{
			online = append(online, msg.Username)
			friendStatusBroadcast <- online
		} else {
			broadcast <- msg
		}
	}
}

func handleMessages() {
	for {
		msg := <- broadcast

		for client := range clients {
			if clients[client] == msg.Recipient || clients[client] == msg.Username{
				err := client.WriteJSON(msg)
				if err != nil {
					log.Printf("error: %v", err)
					client.Close()
					delete(clients, client)
				} 
			}
		}
	}
}

func main() {
	fs := http.FileServer(http.Dir("../public"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", handleConnections)

	go handleMessages()
	go handleFriendslist()

	log.Println("http server started on port :8000")
	err := http.ListenAndServe(":8000", nil) 
	if err != nil{
		log.Fatal("ListenAndServe: ", err)
	}
}