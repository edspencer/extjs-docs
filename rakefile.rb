require 'find'

namespace :extjs do
  
  desc "Concatenates JS files into one called solitaire-all.js"
  task :concatenate do
    files = ["ApiViewport.js", "ApiPanel.js", "DocPanel.js", "MainPanel.js", "Selectbox.js", "SearchField.js", "TabCloseMenu.js", "Initialize.js"]
    concatenated_filename = "docs/resources/javascripts/apidocs-all.js"
    
    #remove old files, create blank ones again
    File.delete(concatenated_filename) and puts "Deleted old file" if File.exists?(concatenated_filename)
    FileUtils.touch(concatenated_filename)
    
    file = File.open(concatenated_filename, 'w') do |f|
      files.each do |i|
        f.puts(IO.read("docs/resources/javascripts/#{i}"))
        f.puts("\n")
      end
    end
  end
  
  desc "Minifies a JS file using YUI Compressor"
  task :minify do
    minified_filename = "docs/resources/javascripts/apidocs-all-min.js"
    FileUtils.rm(minified_filename) if File.exists?(minified_filename)
    
    system("java -jar ../yui-compressor/build/yuicompressor-2.4.jar javascripts/solitaire/solitaire-all.js -o #{minified_filename}")
  end
  
  desc "Prepares site for deployment (concatenates and minifies js code)"
  task :deploy do
    Rake::Task["extjs:concatenate"].execute
    Rake::Task["extjs:minify"].execute
  end
  
end