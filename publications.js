document.addEventListener('DOMContentLoaded', function() {
            // Elements
            const container = document.getElementById('publications-container');
            const searchInput = document.getElementById('search-input');
            const yearFilter = document.getElementById('year-filter');
            const typeFilter = document.getElementById('type-filter');
            const refreshButton = document.getElementById('refresh-button');
            
            // State
            let publications = [];
            let years = new Set();
            let types = new Set();
            
            // Loading Publication
            loadPublications();
            
            
            refreshButton.addEventListener('click', loadPublications);
            
            /* To load and parse the BibTeX file (citation_arranged.bib), cache busting parameter to prevent browser caching,
            Fetching the BibTeX file and checking status; Successfull or Failed to load.
            */
            
            function loadPublications() {
    container.innerHTML = '<div class="loading-indicator">Loading publications from BibTeX file...</div>';
    const cacheBuster = `?cache=${Date.now()}`;
    
    // Git URL
    const bibFileUrl = 'https://raw.githubusercontent.com/ayesha305/Publications/refs/heads/main/publication.bib';
    
    fetch(bibFileUrl + cacheBuster)
        .then(response => {
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Failed to load BibTeX file (${response.status}: ${response.statusText})`);
            }
            
            return response.text();
        })
        .then(data => {
            console.log('BibTeX file loaded, length:', data.length);
            
            if (!data || data.trim().length === 0) {
                throw new Error('BibTeX file is empty');
            }
            
            //Logs to check the content of the file & parsing
            console.log('File preview:', data.substring(0, 200) + '...');

            publications = parseBibTeX(data);
            console.log(`Parsed ${publications.length} publications`);
            
            if (publications.length === 0) {
                throw new Error('No publications found in BibTeX file');
            }
            
            // Reseting the year and type filters
            years.clear();
            types.clear();
            
            publications.forEach(pub => {
                if (pub.year) years.add(pub.year);
                types.add(pub.type);
            });
            
            
            populateFilters();
            displayPublications();
            setupEventListeners();
        })
        .catch(error => {
            console.error('Error loading publications:', error);
            
            container.innerHTML = `
                <div class="error">
                    <h3>Error loading publications</h3>
                    <p>${error.message}</p>
                    <div class="error-help">
                        <h4>Troubleshooting steps:</h4>
                        <ol>
                            <li>Ensure the BibTeX file exists at the specified GitLab URL</li>
                            <li>Check if the GitLab repository is public (or that you have proper access)</li>
                            <li>Verify that CORS is not blocking the request (GitLab allows cross-origin requests to raw files)</li>
                            <li>Check browser console (F12) for more detailed error messages</li>
                            <li>Verify your BibTeX file format</li>
                        </ol>
                    </div>
                </div>
            `;
        });
}            
            
            function parseBibTeX(text) {
                const entries = [];
                
                // splitting on entry tags
                const entryRegex = /@(\w+)\s*{([^,]+),([^@]+?)(?=\s*@|\s*$)/gs;
                let match;
                
                while ((match = entryRegex.exec(text)) !== null) {
                    const type = match[1].toLowerCase();
                    const key = match[2].trim();
                    const content = match[3];
                    
                    console.log(`Found entry of type ${type} with key ${key}`);
                    
                    const entry = { type, key };
                    
                    
                    // Extractinf fields for the publicatios list; Title, Author, Year, Journal, Books and others.
                    const titleMatch = content.match(/title\s*=\s*(?:{([^}]*)}|"([^"]*)")/);
                    if (titleMatch) {
                        entry.title = (titleMatch[1] || titleMatch[2]).trim();
                    }
                    
                  
                    const authorMatch = content.match(/author\s*=\s*{([^}]*)}/);
                    if (authorMatch) {
                        entry.author = authorMatch[1].trim();
                    }
                    
                 
                    const yearMatch = content.match(/year\s*=\s*{?(\d+)}?/);
                    if (yearMatch) {
                        entry.year = yearMatch[1];
                    }
                    
             
                    const journalMatch = content.match(/journal\s*=\s*{([^}]*)}/);
                    if (journalMatch) {
                        entry.journal = journalMatch[1].trim();
                    }
                    
                    const booktitleMatch = content.match(/booktitle\s*=\s*{([^}]*)}/);
                    if (booktitleMatch) {
                        entry.booktitle = booktitleMatch[1].trim();
                    }
                    
                    // need to fix 
                    const otherFields = [
                        'volume', 'number', 'pages', 'publisher', 'address',
                        'doi', 'url', 'month', 'series', 'isbn'
                    ];
                    
                    otherFields.forEach(field => {
                        const fieldRegex = new RegExp(`${field}\\s*=\\s*{([^}]*)}`, 'i');
                        const fieldMatch = content.match(fieldRegex);
                        if (fieldMatch) {
                            entry[field] = fieldMatch[1].trim();
                        }
                    });
                    
                    entries.push(entry);
                }
                
                return entries;
            }
            
            // Format author names for display
            function formatAuthors(authors) {
                if (!authors) return '';
                
                return authors.split(' and ')
                    .map(author => {
                        const parts = author.split(',');
                        if (parts.length > 1) {
                            return parts[1].trim() + ' ' + parts[0].trim();
                        }
                        return author.trim();
                    })
                    .join(', ');
            }
            
            
            function populateFilters() {
                // Clear existing options except first
                while (yearFilter.options.length > 1) {
                    yearFilter.remove(1);
                }
                
                while (typeFilter.options.length > 1) {
                    typeFilter.remove(1);
                }
                
                // filters for sorting years and fetching types of the publications
                const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
                sortedYears.forEach(year => {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    yearFilter.appendChild(option);
                });
                
            
                const typeLabels = {
                    'article': 'Journal Articles',
                    'inproceedings': 'Conference Papers',
                    'techreport' : 'Research Papers',
                    'incollection': 'Presentations & Speeches',
                    'book': 'Books',
                    'misc': 'Miscellaneous'
                };
                
                Array.from(types).sort().forEach(type => {
                    const option = document.createElement('option');
                    option.value = type;
                    option.textContent = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);
                    typeFilter.appendChild(option);
                });
            }
            
           
            function setupEventListeners() {

                // removing the old Events
                searchInput.removeEventListener('input', displayPublications);
                yearFilter.removeEventListener('change', displayPublications);
                typeFilter.removeEventListener('change', displayPublications);
                
                // Adding new events
                searchInput.addEventListener('input', displayPublications);
                yearFilter.addEventListener('change', displayPublications);
                typeFilter.addEventListener('change', displayPublications);
            }
            
            //Displaying publications
            function displayPublications() {
                const searchTerm = searchInput.value.toLowerCase();
                const yearValue = yearFilter.value;
                const typeValue = typeFilter.value;
                
                
                const filtered = publications.filter(pub => {
                    
                    if (yearValue !== 'all' && pub.year !== yearValue) return false;
                    
                    
                    if (typeValue !== 'all' && pub.type !== typeValue) return false;
                    
                    
                    if (searchTerm) {
                        return (
                            (pub.title && pub.title.toLowerCase().includes(searchTerm)) ||
                            (pub.author && pub.author.toLowerCase().includes(searchTerm)) ||
                            (pub.journal && pub.journal.toLowerCase().includes(searchTerm)) ||
                            (pub.booktitle && pub.booktitle.toLowerCase().includes(searchTerm))
                        );
                    }
                    
                    return true;
                });
                
                // Grouping by Type
                const grouped = {};
                
                filtered.forEach(pub => {
                    if (!grouped[pub.type]) {
                        grouped[pub.type] = [];
                    }
                    grouped[pub.type].push(pub);
                });
                
                
                container.innerHTML = '';
                
                // Handelling no results
                if (filtered.length === 0) {
                    container.innerHTML = `
                        <div class="no-results">
                            No publications match your search criteria.
                        </div>
                    `;
                    return;
                }
                
                // Type order and labels
                const typeOrder = ['inproceedings', 'article', 'book', 'incollection', 'misc'];
                const typeLabels = {
                    'inproceedings': 'Conference Papers',
                    'article': 'Journal Articles',
                    'techreport' : 'Research Papers',
                    'incollection': 'Presentations & Speeches',
                    'book': 'Books',
                    'misc': 'Other Publications'
                };
                
                
                typeOrder.forEach(type => {
                    if (!grouped[type] || grouped[type].length === 0) return;
                    
               
                    const sorted = grouped[type].sort((a, b) => {
                        const yearA = parseInt(a.year || '0');
                        const yearB = parseInt(b.year || '0');
                        return yearB - yearA;
                    });
                    
                    const section = document.createElement('div');
                    section.className = 'publication-section';
                    
                    
                    const header = document.createElement('div');
                    header.className = 'section-header';
                    header.innerHTML = `
                        <h2>${typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1)}</h2>
                        <span class="toggle">▼</span>
                    `;
                    
                    const pubList = document.createElement('div');
                    pubList.className = 'publication-list';
                    
                /* loop through each publication list; parsed from BibTeX file,
                Determining the category in publication list and adding specific information to each category,
                Creating HTML element for each publication and populating it with extracted information Title, author, year and etc.
                */
                    sorted.forEach(pub => {
                       
                        let venue = '';
                        
                        if (pub.journal) {
                            venue = pub.journal;
                            if (pub.volume) venue += `, ${pub.volume}`;
                            if (pub.number) venue += `(${pub.number})`;
                            if (pub.pages) venue += `, pp. ${pub.pages}`;
                        } else if (pub.booktitle) {
                            venue = pub.booktitle;
                            if (pub.pages) venue += `, pp. ${pub.pages}`;
                        }
                        
                        if (pub.publisher) {
                            venue += venue ? `, ${pub.publisher}` : pub.publisher;
                        }
                        
                        if (pub.address) {
                            venue += venue ? `, ${pub.address}` : pub.address;
                        }
                        
                       
                        const pubEl = document.createElement('div');
                        pubEl.className = 'publication';
                        pubEl.innerHTML = `
                            <div class="publication-year">${pub.year || ''}</div>
                            <div class="publication-title">${pub.title || 'Untitled'}</div>
                            <div class="publication-authors">${formatAuthors(pub.author)}</div>
                            ${venue ? `<div class="publication-venue">${venue}</div>` : ''}
                            <div class="publication-links">
                                ${pub.doi ? `<a href="https://doi.org/${pub.doi}" target="_blank">DOI</a>` : ''}
                                ${pub.url ? `<a href="${pub.url}" target="_blank">Link</a>` : ''}
                            </div>
                        `;
                        
                        pubList.appendChild(pubEl);
                    });
                    
                    section.appendChild(header);
                    section.appendChild(pubList);
                    container.appendChild(section);
                    
                    // Habdelling functionality for each category
                    header.addEventListener('click', () => {
                        header.classList.toggle('collapsed');
                        pubList.classList.toggle('hidden');
                        const toggle = header.querySelector('.toggle');
                        toggle.textContent = pubList.classList.contains('hidden') ? '▲' : '▼';
                    });
                });
            }
        });