cd packages

for dir in $(ls -d */); do
    cd "$dir"
    npm_config_ignore_scripts=true npm link
    cd ..
done

for dir in generator ui; do
    cd "$dir"
    npm_config_ignore_scripts=true npm link @pdfme/common
    npm_config_ignore_scripts=true npm link @pdfme/schemas
    if [ "$dir" = "ui" ]; then
        npm_config_ignore_scripts=true npm link @pdfme/converter
    fi
    cd ..
done
