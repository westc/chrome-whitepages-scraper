chrome.fileSystem.restoreEntry('CF12964382D660B4430A7F74ECD32EA0:Chrome App', function(entry) {
    chrome.fileSystem.getWritableEntry(entry, function(entry) {
        entry.getFile('file1.txt', {create:true}, function(entry) {
            entry.createWriter(function(writer) {
                writer.write(new Blob(['Lorem'], {type: 'text/plain'}));
            });
        });
        entry.getFile('file2.txt', {create:true}, function(entry) {
            entry.createWriter(function(writer) {
                writer.write(new Blob(['Ipsum'], {type: 'text/plain'}));
            });
        });
    });
});