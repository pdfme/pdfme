cd packages

for dir in $(ls -d */); do
    cd "$dir"
    npm link
    cd ..
done

for dir in generator ui; do
    cd "$dir"
    npm link @pdfme/common
    npm link @pdfme/schemas
    cd ..
done
