var CSV = {
    parse: function(str, delimeter) {
        var arr = [];
        if (!delimeter) delimeter = ',';
        var quote = false;  // true means we're inside a quoted field

        // iterate over each character, keep track of current row and column (of the returned array)
        for (var row = col = c = 0; c < str.length; c++) {
            var cc = str[c], nc = str[c+1];        // current character, next character
            arr[row] = arr[row] || [];             // create a new row if necessary
            arr[row][col] = arr[row][col] || '';   // create a new column (start with empty string) if necessary

            // If the current character is a quotation mark, and we're inside a
            // quoted field, and the next character is also a quotation mark,
            // add a quotation mark to the current column and skip the next character
            if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }

            // If it's just one quotation mark, begin/end quoted field
            if (cc == '"') { quote = !quote; continue; }

            // If it's a comma and we're not in a quoted field, move on to the next column
            if (cc == delimeter && !quote) { ++col; continue; }

            // If it's a newline and we're not in a quoted field, move on to the next
            // row and move to column 0 of that new row
            if (cc == '\n' && !quote) { ++row; col = 0; continue; }

            // Otherwise, append the current character to the current column
            arr[row][col] += cc;
        }
        return arr;
    },

    stringify: function(arr, delimeter) {
        if (!delimeter) delimeter = ',';
        var lines = [];
        for (var i = 0, len = arr.length; i < len; i++) {
          var line = arr[i];
          line = line.map(function(val){
            if (typeof val !== 'undefined') val = val.toString();
            else val = '';
            val = val.replace(/\r?\n|\r/g, ' ');
            val = val.replace(/"/g, '""');
            var re = new RegExp('[\\r\\n' + delimeter + ']');
            if (val.match(re)) val = '"' + val + '"';
            return val;
          });
          lines.push(line.join(delimeter));
        }
        return lines.join('\n');
    }
};
