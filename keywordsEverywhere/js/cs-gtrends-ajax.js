(()=>{
  let xhr = XMLHttpRequest.prototype;
  let send = xhr.send;
  xhr.send = function() {
    this.addEventListener("load", function() {
      let url = this.responseURL;
      if (url.indexOf('/multiline') === -1) return;
      if (this.responseType === '' || this.responseType === 'text') {
        try {
          let response = this.responseText;
          if (response.startsWith(")]}'")) {
            response = response.slice(5).trim();
          }
          JSON.parse(response);
          let node = document.createElement("template");
          node.setAttribute("data-multiline", '');
          node.setAttribute("data-url", url);
          node.textContent = response;
          document.body.appendChild(node);
        } catch (e) {
          console.log(e);
        }
      }
    });
    return send.apply(this, arguments);
  };
})();
