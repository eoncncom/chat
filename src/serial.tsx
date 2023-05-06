/**
 * author: will.xiao
 * email: eoncncom@gmail.com
 * version: 1.0
 * desc:
 */

import * as React from "react";
import "./index.css";

type ISerialProps = {};
type ISerialState = {};

class Serial extends React.Component<ISerialProps, ISerialState> {
  isInit = false;
  private ref = React.createRef<HTMLButtonElement>();
  constructor(props: ISerialProps) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    // window.document.body.addEventListener("mousemove", () => {
    //   console.log("mousemove");
    //   this.init();
    // });
    setTimeout(() => {
      if (this.ref.current) {
        (this.ref.current as any).trigger("click");
      }
    }, 2000);
  }

  render() {
    return (
      <div className="App">
        <button onClick={() => this.init()}>测试</button>
      </div>
    );
  }

  private async init() {
    if (this.isInit) {
      return;
    }
    this.isInit = true;
    try {
      const port = await (navigator as any).serial.requestPort();
      port.addEventListener("connect", () => {
        console.log("connect");
      });
      port.addEventListener("disconnect", () => {
        console.log("disconnect");
      });
      port.addEventListener("receive", (e: any) => {
        console.log("receive", e);
      });
      port.addEventListener("send", (e: any) => {
        console.log("send", e);
      });
      await port.open({ baudRate: 9600 });
      const reader = port.readable.getReader();
      let result = "";
      // Read data from the port
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Allow the serial port to be closed later.
          console.log("done");
          reader.releaseLock();
          break;
        }
        if (value) {
          // value is a Uint8Array.
          console.log(value);
          const one = new TextDecoder().decode(value);
          result += one;
          if (value[value.length - 1] === 13) {
            console.log(result);
            result = "";
          }
        }
      }
    } catch (e) {
      console.log(e);
      this.isInit = false;
    }
  }

  // 写一个休眠函数
  sleep(arg0: number) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, arg0);
    });
  }
}

export default Serial;
