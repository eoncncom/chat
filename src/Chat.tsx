import React from "react";
import "./App.css";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

declare global {
  interface Window {
    mytest: {
      hello: () => Promise<string>;
      getPrinter: () => Promise<string[]>;
    };
  }
}

const baseUrl = "http://cd.xuhen.com:3047/";
// const baseUrl = "https://api.openai.com/v1";
const model = "gpt-3.5-turbo";

interface ChatMessage {
  role: "user"|"system",
  content: string;
}

interface IState{
  content:string;
}


class Chat extends React.Component<unknown,IState> {

  constructor(props:unknown) {
    super(props);
    this.state = {
      content: "",
    }
  }
  private readonly ref = React.createRef<HTMLInputElement>();
  private readonly refContent = React.createRef<HTMLDivElement>();
  private content:string = "";


  handleSend() {
    const msg = this.ref.current?.value;
    if (!msg) {
      alert("请输入内容");
      return;
    }
    this.content = "";
    if(this.refContent.current){
      this.refContent.current.innerHTML = "";
    }
    const messageList: ChatMessage = { role: "user", content: msg };
    this.httpEventStream(messageList).then(async (response)=>{
      if (!response.ok) {
        const error:any = response.json();
        console.error(error.error)
        throw new Error('Request failed')
      }
      const data = response.body
      if (!data)
        throw new Error('No data')

      const reader = data.getReader()
      const decoder = new TextDecoder('utf-8')
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        console.log(11111,value);
        if (value) {
          const char = decoder.decode(value)

          if (char){
            this.content = this.content + char;
            this.content = this.content.replaceAll("\n\n","\n");
            if(this.refContent.current){
              this.refContent.current.innerHTML = this.content.replaceAll("\n","<br />");
            }
          }
        }
        done = readerDone
      }
    })
  };

  render() {
    return (
      <div className="App" style={{padding:"12px 20px"}}>
        <div
          ref={this.refContent}
          style={{
            boxSizing: "border-box",
            width: 800,
            height: 400,
            border: "1px solid #f0f1f3",
            background: "white",
            color: "#4a4a4a",
            lineHeight: "20px",
            fontSize: 14,
            textAlign: "left",
            padding: "8px 12px",
          }}
        />
        <div style={{width: 800, height: 36, display: "flex", marginTop: 12}}>
          <input
            defaultValue="写一个小故事"
            maxLength={100}
            style={{flex: 1,height:"36", paddingLeft: "12px",border: "1px solid #f0f1f3",}}
            ref={this.ref}
          />
          <button
            style={{width: "96px",color:"#4a4a4a", fontSize:"16px", height: "36px", marginLeft: 20, border: "1px solid #f0f1f3",background:"white"}}
            onClick={() => this.handleSend()}
          >
            发送
          </button>
        </div>
        {/*<button*/}
        {/*  onClick={async () => {*/}
        {/*    const res = await window.mytest.getPrinter();*/}
        {/*    console.log("打印机列表", res);*/}
        {/*  }}*/}
        {/*>*/}
        {/*  获取打印机列表*/}
        {/*</button>*/}
      </div>
    );
  }

  generatePayload = (
    messages: ChatMessage
  ): RequestInit & { dispatcher?: any } => ({
    headers: {
      "Access-Control-Request-Headers": "",
      "Access-Control-Request-Method": "POST",
      "Origin": "http://localhost:3000",
    },
    method: "POST",
    body: JSON.stringify({
      prompt:messages.content,
      temperature: 0.9,
      top_p: 0.2,
      history: [],
    }),
  });

  parseOpenAIStream(rawResponse: Response){
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    if (!rawResponse.ok) {
      return new Response(rawResponse.body, {
        status: rawResponse.status,
        statusText: rawResponse.statusText,
      });
    }

    const that = this;
    const stream = new ReadableStream({
      async start(controller) {
        const streamParser = (event: ParsedEvent | ReconnectInterval) => {
          console.log("event:", event)
          if (event.type === "event") {
            const data = event.data;
            if (data === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const json = JSON.parse(data);
              console.log("json=",json);
              const text = json.response || "";
              const queue = encoder.encode(text);
              controller.enqueue(queue);
            } catch (e) {
              controller.error(e);
            }
          }
        };

        const parser = createParser(streamParser);
        const reader = rawResponse.body?.getReader();
        if (!reader){
          throw new Error("no reader");
        }
        let done = false;
        while (!done){
          const result = await reader.read();
          const value = decoder.decode(result.value);
          console.log("result:", result.done, value)
          const res = value.replaceAll("'","\"")
            .replaceAll("True","true")
            .replaceAll("False","false");
          if (res){
            const json = JSON.parse(res);
            that.content = that.content + json.response||"";
            that.content = that.content.replaceAll("\n\n","\n");
            if(that.refContent.current){
              that.refContent.current.innerHTML = that.content.replaceAll("\n","<br />");
            }
          }
          done = result.done;
          parser.feed(res);
        }
      },
    });

    return new Response(stream);
  };

  httpEventStream(messages: ChatMessage){
    const initOptions = this.generatePayload(messages);

    return fetch(
      `${baseUrl}`,
      initOptions
    ).then((response:Response)=>{
      return this.parseOpenAIStream(response);
    }).catch((err: Error) => {
      console.error(err);
      return new Response(
        JSON.stringify({
          error: {
            code: err.name,
            message: err.message,
          },
        }),
        { status: 500 }
      );
    });
  }
}

export default Chat;
