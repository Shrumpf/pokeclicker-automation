class Automation
{
    /**************************/
    /*    PUBLIC INTERFACE    */
    /**************************/
    static start()
    {
        var timer = setInterval(function()
        {
            // Check if the game window has loaded
            if (!document.getElementById("game").classList.contains("loading"))
            {
                clearInterval(timer);

                // Log automation start
                console.log(`[${GameConstants.formatDate(new Date())}] %cStarting automation..`, "color:#8e44ad;font-weight:900;");

                this.Menu.build();

                this.Click.start();
                this.Underground.start();
                this.Hatchery.start();
                this.Farm.start();
                this.Gym.start();
                this.Dungeon.start();

                // Add a notification button to the automation menu
                this.Menu.__addAutomationButton("Notification", "automationNotificationsEnabled", true);

                // Log automation startup completion
                console.log(`[${GameConstants.formatDate(new Date())}] %cAutomation started`, "color:#2ecc71;font-weight:900;");
            }
        }.bind(this), 200); // Try to instanciate every 0.2s
    }

    /**************************/
    /*   PRIVATE  INTERFACE   */
    /**************************/
    static __sendNotif(message)
    {
        if (localStorage.getItem("automationNotificationsEnabled") == "true")
        {
            Notifier.notify({
                                title: "Automation",
                                message: message,
                                type: NotificationConstants.NotificationOption.primary,
                                timeout: 3000,
                            });
        }
    }

    static __isInInstanceState()
    {
        return (App.game.gameState === GameConstants.GameState.dungeon)
            || (App.game.gameState === GameConstants.GameState.battleFrontier);
    }

    static __previousRegion = null;

    /**************************/
    /*    AUTOMATION  MENU    */
    /**************************/

    static Menu = class AutomationMenu
    {
        static build()
        {
            let node = document.createElement("div");
            node.style.position = "absolute";
            node.style.top = "50px";
            node.style.right = "10px";
            node.style.width = "145px";
            node.style.textAlign = "right";
            node.setAttribute("id", "automationContainer");
            document.body.appendChild(node);

            let automationTitle = '<img src="assets/images/badges/Bolt.png" height="20px">Automation<img src="assets/images/badges/Bolt.png" height="20px">';
            this.__addCategory("automationButtons", automationTitle);

            // Initialize trivia
            this.Trivia.start();
        }

        static Trivia = class AutomationTrivia
        {
            static start()
            {
                this.__buildMenu();
                this.__initializeGotoLocationTrivia();
                this.__initializeRoamingRouteTrivia();
                this.__initializeEvolutionTrivia();
            }

            static __displayedRoamingRoute = null;
            static __currentLocationListSize = 0;

            static __buildMenu()
            {
                // Hide the gym and dungeon fight menus by default and disable auto fight
                let triviaTitle = '<img src="assets/images/oakitems/Treasure_Scanner.png" height="20px" style="position:relative; bottom: 3px;">'
                                +     '&nbsp;Trivia&nbsp;'
                                + '<img src="assets/images/oakitems/Treasure_Scanner.png" style="position:relative; bottom: 3px;" height="20px">';
                let triviaDiv = Automation.Menu.__addCategory("automationTrivia", triviaTitle);

                // Add roaming route div
                let node = document.createElement("div");
                node.setAttribute("id", "roamingRouteTrivia");
                node.style.textAlign = "center";
                triviaDiv.appendChild(node);

                // Add available evolution div
                node = document.createElement("div");
                node.setAttribute("id", "availableEvolutionTrivia");
                node.style.textAlign = "center";
                node.style.borderTop = "solid #AAAAAA 1px";
                node.style.marginTop = "10px";
                node.style.paddingTop = "10px";
                triviaDiv.appendChild(node);

                // Add go to location div
                let gotoLocationDiv = document.createElement("div");
                gotoLocationDiv.setAttribute("id", "gotoLocationTrivia");
                gotoLocationDiv.style.textAlign = "center";
                gotoLocationDiv.style.borderTop = "solid #AAAAAA 1px";
                gotoLocationDiv.style.marginTop = "10px";
                gotoLocationDiv.style.paddingTop = "10px";
                triviaDiv.appendChild(gotoLocationDiv);

                // Add go to location button
                let gotoButton = document.createElement("button");
                gotoButton.textContent = "Go";
                gotoButton.id = "moveToLocationButton";
                gotoButton.onclick = this.__moveToLocation;
                gotoButton.classList.add("btn");
                gotoButton.classList.add("btn-primary");
                gotoButton.style.width = "30px";
                gotoButton.style.height = "20px";
                gotoButton.style.padding = "0px";
                gotoButton.style.borderRadius = "4px";
                gotoButton.style.position = "relative";
                gotoButton.style.bottom = "1px";
                gotoLocationDiv.appendChild(gotoButton);

                // Add the text next to the button
                let gotoText = document.createElement("span");
                gotoText.textContent = " to:";
                gotoLocationDiv.appendChild(gotoText);

                // Add go to location drop-down list
                let gotoList = document.createElement("select");
                gotoList.className = "custom-select";
                gotoList.name = "gotoSelectedLocation";
                gotoList.id = gotoList.name;
                gotoList.style.width = "calc(100% - 10px)";
                gotoList.style.marginTop = "3px";
                gotoList.style.paddingLeft = "2px";
                gotoLocationDiv.appendChild(gotoList);
            }

            static __initializeGotoLocationTrivia()
            {
                // Set the initial value
                this.__refreshGotoLocationTrivia();

                setInterval(this.__refreshGotoLocationTrivia.bind(this), 1000); // Refresh every 1s
            }

            static __refreshGotoLocationTrivia()
            {
                let button = document.getElementById("moveToLocationButton");

                // Disable the button if the player is in an instance
                if (Automation.__isInInstanceState())
                {
                    if (!button.disabled)
                    {
                        button.disabled = true;
                        button.classList.remove("btn-primary");
                        button.classList.add("btn-secondary");
                    }
                    return;
                }
                else if (button.disabled)
                {
                    button.disabled = false;
                    button.classList.add("btn-primary");
                    button.classList.remove("btn-secondary");
                }

                let gotoList = document.getElementById("gotoSelectedLocation");

                let filteredList = Object.entries(TownList).filter(([townName, town]) => (town.region === player.region));
                let unlockedTownCount = filteredList.reduce((count, [townName, town]) => count + (town.isUnlocked() ? 1 : 0), 0);

                // Clear the list if the player changed region
                if (Automation.__previousRegion !== player.region)
                {
                    // Drop all elements and rebuild the list
                    gotoList.innerHTML = "";

                    // Sort the list alphabetically
                    filteredList.sort(([townNameA, townA], [townNameB, townB]) =>
                                      {
                                          if (townNameA > townNameB)
                                          {
                                              return 1;
                                          }
                                          if (townNameA < townNameB)
                                          {
                                              return -1;
                                          }

                                          return 0;
                                      });

                    let selectedItemSet = false;
                    // Build the new drop-down list
                    filteredList.forEach(([townName, town]) =>
                        {
                            const type = (town instanceof DungeonTown) ? "&nbsp;⚔&nbsp;" : "🏫";

                            let opt = document.createElement("option");
                            opt.value = townName;
                            opt.id = townName;
                            opt.innerHTML = type + ' ' + townName;

                            // Don't show the option if it's not been unlocked yet
                            if (!town.isUnlocked())
                            {
                                opt.style.display = "none";
                            }
                            else if (!selectedItemSet)
                            {
                                opt.selected = true;
                                selectedItemSet = true;
                            }

                            gotoList.options.add(opt);
                        });

                    Automation.__previousRegion = player.region;

                    this.__currentLocationListSize = unlockedTownCount;
                }
                else if (this.__currentLocationListSize != unlockedTownCount)
                {
                    filteredList.forEach(([townName, town]) =>
                        {
                            if (town.isUnlocked())
                            {
                                let opt = gotoList.options.namedItem(townName);
                                if (opt.style.display === "none")
                                {
                                    opt.style.display = "block";
                                }
                            }
                        });
                }
            }

            static __moveToLocation()
            {
                // Forbid travel if an instance is in progress (it breaks the game)
                if (Automation.__isInInstanceState())
                {
                    return;
                }

                let selectedDestination = document.getElementById("gotoSelectedLocation").value;
                MapHelper.moveToTown(selectedDestination);
            }

            static __initializeRoamingRouteTrivia()
            {
                // Set the initial value
                this.__refreshRoamingRouteTrivia();

                setInterval(this.__refreshRoamingRouteTrivia.bind(this), 1000); // Refresh every 1s (changes every 8h, but the player might change map)
            }

            static __refreshRoamingRouteTrivia()
            {
                let currentRoamingRoute = RoamingPokemonList.getIncreasedChanceRouteByRegion(player.region)().number;
                if (this.__displayedRoamingRoute !== currentRoamingRoute)
                {
                    this.__displayedRoamingRoute = RoamingPokemonList.getIncreasedChanceRouteByRegion(player.region)().number;
                    let triviaDiv = document.getElementById("roamingRouteTrivia");
                    triviaDiv.innerHTML = "Roaming: Route " + this.__displayedRoamingRoute.toString();
                }
            }

            static __initializeEvolutionTrivia()
            {
                // Set the initial value
                this.__refreshEvolutionTrivia();

                setInterval(this.__refreshEvolutionTrivia.bind(this), 1000); // Refresh every 1s
            }

            static __refreshEvolutionTrivia()
            {
                let triviaDiv = document.getElementById("availableEvolutionTrivia");

                let evoStones = Object.keys(GameConstants.StoneType).filter(
                    stone => isNaN(stone) && stone !== "None" && this.__hasStoneEvolutionCandidate(stone));

                triviaDiv.hidden = (evoStones.length == 0);

                if (!triviaDiv.hidden)
                {
                    triviaDiv.innerHTML = "Possible evolution:<br>";

                    evoStones.forEach((stone) => triviaDiv.innerHTML += '<img style="max-width: 28px;" src="assets/images/items/evolution/' + stone + '.png"'
                                                                      + ' onclick="javascript: Automation.Menu.Trivia.__goToStoneMenu(\'' + stone + '\');">');
                }
            }

            static __goToStoneMenu(stone)
            {
                // Display the menu
                $("#showItemsModal").modal("show");

                // Switch tab if needed
                $("#evoStones").addClass("active");
                $("#itemBag").removeClass("active")
                $("#keyItems").removeClass("active");

                // Could not find a better way, unfortunately
                let menuTabs = $("#evoStones")[0].parentElement.parentElement.firstElementChild.children;
                menuTabs[0].firstElementChild.classList.add("active");
                menuTabs[1].firstElementChild.classList.remove("active");
                menuTabs[2].firstElementChild.classList.remove("active");

                // Switch to the selected stone
                ItemHandler.stoneSelected(stone);
                ItemHandler.pokemonSelected("");
            }

            static __hasStoneEvolutionCandidate(stone)
            {
                var hasCandidate = false;

                PokemonHelper.getPokemonsWithEvolution(GameConstants.StoneType[stone]).forEach(
                    (pokemon) =>
                    {
                        hasCandidate |= (PartyController.getStoneEvolutionsCaughtStatus(pokemon.id, GameConstants.StoneType[stone])[0] == 0);
                    });

                return hasCandidate;
            }
        }

        static __addCategory(categoyName, title)
        {
            let mainNode = document.getElementById("automationContainer");

            let newNode = document.createElement("div");
            newNode.setAttribute("id", categoyName);

            newNode.style.backgroundColor = "#444444";
            newNode.style.color = "#eeeeee";
            newNode.style.borderRadius = "5px";
            newNode.style.paddingTop = "5px";
            newNode.style.paddingBottom = "10px";
            newNode.style.borderColor = "#aaaaaa";
            newNode.style.borderStyle = "solid";
            newNode.style.borderWidth = "1px";
            newNode.style.marginTop = "5px";

            newNode.innerHTML = '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin-bottom:10px; padding-bottom:5px;">'
                              +     title
                              + '</div>'
                              + '<div id="' + categoyName + 'Div">'
                              + '</div>';

            mainNode.appendChild(newNode);

            return newNode;
        }

        static __addAutomationButton(name, id, addSeparator = false, parentDiv = "automationButtonsDiv", forceDisabled = false)
        {
            // Enable automation by default, in not already set in cookies
            if (localStorage.getItem(id) == null)
            {
                localStorage.setItem(id, true)
            }

            if (forceDisabled)
            {
                localStorage.setItem(id, false);
            }

            let buttonClass = (localStorage.getItem(id) === "true") ? "btn-success" : "btn-danger";
            let buttonText = (localStorage.getItem(id) === "true") ? "On" : "Off";

            let buttonDiv = document.getElementById(parentDiv)

            if (addSeparator)
            {
                buttonDiv.innerHTML += '<div style="text-align:center; border-bottom:solid #AAAAAA 1px; margin:10px 0px; padding-bottom:5px;"></div>'
            }

            let newButton = '<div style="padding:0px 10px; line-height:24px;">'
                          + name + ' : <button id="' + id + '" class="btn ' + buttonClass + '" '
                          + 'style="width: 30px; height: 20px; padding:0px; border: 0px; border-radius:4px;" '
                          + 'onClick="javascript:Automation.Menu.__toggleAutomation(\'' + id + '\')"'
                          + 'type="button">' + buttonText + '</button><br>'
                          + '</div>';

            buttonDiv.innerHTML += newButton;
        }

        static __toggleAutomation(id)
        {
            let button = document.getElementById(id);
            let newStatus = !(localStorage.getItem(id) == "true");
            if (newStatus)
            {
                button.classList.remove("btn-danger");
                button.classList.add("btn-success");
                button.innerText = "On";
            }
            else
            {
                button.classList.remove("btn-success");
                button.classList.add("btn-danger");
                button.innerText = "Off";
            }

            localStorage.setItem(button.id, newStatus);
        }
    }

    /**************************/
    /*    CLICK AUTOMATION    */
    /**************************/

    static Click = class AutomationClick
    {
        static start()
        {
            this.__buildRouteMaxHealthMap();

            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("AutoClick", "autoClickEnabled");
            Automation.Menu.__addAutomationButton("Best route", "bestRouteClickEnabled");

            // Disable best route by default
            if (localStorage.getItem("bestRouteClickEnabled") == null)
            {
                localStorage.setItem("bestRouteClickEnabled", false);
            }

            // Set best route refresh loop
            setInterval(function ()
            {
                if (localStorage.getItem("bestRouteClickEnabled") === "true")
                {
                    this.__goToBestRoute();
                }
            }.bind(this), 10000); // Refresh every 10s

            // Set auto-click loop
            setInterval(function ()
            {
                if (localStorage.getItem("autoClickEnabled") == "true")
                {
                    // Click while in a normal battle
                    if (App.game.gameState == GameConstants.GameState.fighting)
                    {
                        Battle.clickAttack();
                    }
                    // Click while in a gym battle
                    else if (App.game.gameState === GameConstants.GameState.gym)
                    {
                        GymBattle.clickAttack();
                    }
                    // Click while in a dungeon - will also interact with non-battle tiles (e.g. chests)
                    else if (App.game.gameState === GameConstants.GameState.dungeon)
                    {
                        if (DungeonRunner.fighting() && !DungeonBattle.catching())
                        {
                            DungeonBattle.clickAttack();
                        }
                        else if (localStorage.getItem("dungeonFightEnabled") != "true")
                        {
                            if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
                            {
                                DungeonRunner.openChest();
                            }
                            else if ((DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                                     && !DungeonRunner.fightingBoss())
                            {
                                DungeonRunner.startBossFight();
                            }
                        }
                    }
                }
            }.bind(this), 50); // The app hard-caps click attacks at 50
        }

        // Map of Map [ region => [ route => maxHp ]]
        static __routeMaxHealthMap = new Map();

        static __bestRouteRegion = null;
        static __bestRoute = null;
        static __nextBestRoute = null;

        static __buildRouteMaxHealthMap()
        {
            Routes.regionRoutes.forEach((route) =>
                {
                    if (route.region >= this.__routeMaxHealthMap.size)
                    {
                        this.__routeMaxHealthMap.set(route.region, new Map());
                    }

                    let routeMaxHealth = this.__getRouteMaxHealth(route);
                    this.__routeMaxHealthMap.get(route.region).set(route.number, routeMaxHealth);
                }, this);
        }

        static __goToBestRoute()
        {
            // Disable best route if any other auto-farm is enabled, or an instance is in progress, and exit
            if ((localStorage.getItem("dungeonFightEnabled") == "true")
                || (localStorage.getItem("gymFightEnabled") == "true")
                || Automation.__isInInstanceState())
            {
                if (localStorage.getItem("bestRouteClickEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("bestRouteClickEnabled");
                }

                return;
            }

            let playerClickAttack = App.game.party.calculateClickAttack();

            let didRegionChange = (this.__bestRouteRegion !== player.region);
            let needsNewRoad = didRegionChange
                            || ((this.__nextBestRoute !== this.__bestRoute)
                                && (this.__routeMaxHealthMap.get(player.region).get(this.__nextBestRoute) < playerClickAttack));

            // Don't refresh if we already are on the best road
            if ((this.__bestRoute === player.route()) && !needsNewRoad)
            {
                return;
            }

            if (needsNewRoad)
            {
                this.__bestRouteRegion = player.region;

                let regionRoutes = Routes.getRoutesByRegion(player.region);

                // If no routes are below the user attack, juste choose the 1st one
                this.__bestRoute = regionRoutes[0].number;
                this.__nextBestRoute = this.__bestRoute;

                // Fortunately routes are sorted by attack
                regionRoutes.every((route) =>
                    {
                        if (Automation.Click.__routeMaxHealthMap.get(player.region).get(route.number) < playerClickAttack)
                        {
                            Automation.Click.__bestRoute = route.number;

                            return true;
                        }

                        Automation.Click.__nextBestRoute = route.number;
                        return false;
                    });
            }

            if (this.__bestRoute !== player.route())
            {
                MapHelper.moveToRoute(this.__bestRoute, player.region);
            }
        }

        static __getRouteMaxHealth(route)
        {
            let routeMaxHealth = 0;
            RouteHelper.getAvailablePokemonList(route.number, route.region).forEach((pokemanName) =>
                {
                    routeMaxHealth = Math.max(routeMaxHealth, this.__getPokemonMaxHealth(route, pokemanName));
                }, this);

            return routeMaxHealth;
        }

        static __getPokemonMaxHealth(route, pokemonName)
        {
            // Based on https://github.com/pokeclicker/pokeclicker/blob/b5807ae2b8b14431e267d90563ae8944272e1679/src/scripts/pokemons/PokemonFactory.ts#L33
            let basePokemon = PokemonHelper.getPokemonByName(pokemonName);

            let getRouteAverageHp = function()
            {
                let poke = [...new Set(Object.values(Routes.getRoute(route.region, route.number).pokemon).flat().map(p => p.pokemon ?? p).flat())];
                let total = poke.map(p => pokemonMap[p].base.hitpoints).reduce((s, a) => s + a, 0);
                return total / poke.length;
            };

            let routeAvgHp = getRouteAverageHp();
            let routeHp = PokemonFactory.routeHealth(route.number, route.region);

            return Math.round((routeHp - (routeHp / 10)) + (routeHp / 10 / routeAvgHp * basePokemon.hitpoints));
        }
    }

    /**************************/
    /*   DUNGEON AUTOMATION   */
    /**************************/

    static Dungeon = class AutomationDungeon
    {
        static __isCompleted = false;
        static __bossPosition = null;
        static __chestPositions = [];
        static __previousTown = null;

        static start()
        {
            this.__buildMenu();

            setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
        }

        static __mainLoop()
        {
            if ((App.game.gameState === GameConstants.GameState.dungeon)
                && (localStorage.getItem("dungeonFightEnabled") == "true"))
            {
                // Let any fight finish before moving
                if (DungeonRunner.fightingBoss() || DungeonRunner.fighting())
                {
                    return;
                }

                if (this.__isCompleted)
                {
                    if (this.__chestPositions.length > 0)
                    {
                        let chestLocation = this.__chestPositions.pop();
                        DungeonRunner.map.moveToTile(chestLocation);
                    }
                    else
                    {
                        DungeonRunner.map.moveToTile(this.__bossPosition);
                    }
                }

                let playerCurrentPosition = DungeonRunner.map.playerPosition();

                if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.boss)
                {
                    // Persist the boss position, to go back to it once the board has been cleared
                    this.__bossPosition = playerCurrentPosition;

                    if (this.__isCompleted)
                    {
                        DungeonRunner.startBossFight();
                        this.__resetSavedStates();
                        return;
                    }
                }
                else if (DungeonRunner.map.currentTile().type() === GameConstants.DungeonTile.chest)
                {
                    if (this.__isCompleted)
                    {
                        DungeonRunner.openChest();
                        return;
                    }
                    else
                    {
                        this.__chestPositions.push(playerCurrentPosition);
                    }
                }

                let maxIndex = (DungeonRunner.map.board().length - 1);
                let isEvenRaw = ((maxIndex - playerCurrentPosition.y) % 2) == 0;
                let isLastTileOfTheRaw = (isEvenRaw && (playerCurrentPosition.x == maxIndex))
                                      || (!isEvenRaw && (playerCurrentPosition.x == 0));

                // Detect board ending and move to the boss if it's the case
                if ((playerCurrentPosition.y == 0) && isLastTileOfTheRaw)
                {
                    this.__isCompleted = true;
                    return;
                }

                // Go full left at the beginning of the map
                if (playerCurrentPosition.y == maxIndex)
                {
                    if ((playerCurrentPosition.x != 0)
                        && !DungeonRunner.map.board()[playerCurrentPosition.y][playerCurrentPosition.x - 1].isVisited)
                    {
                        DungeonRunner.map.moveLeft();
                        return;
                    }
                }

                // Move up once a raw has been fully visited
                if (isLastTileOfTheRaw)
                {
                    DungeonRunner.map.moveUp();
                    return;
                }

                // Move right on even raws, left otherwise
                if (isEvenRaw)
                {
                    DungeonRunner.map.moveRight();
                }
                else
                {
                    DungeonRunner.map.moveLeft();
                }

                return;
            }

            // Only display the menu if:
            //    - The player is in a town (dungeons are attached to town)
            //    - The player has bought the dungeon ticket
            //    - The player has enought dungeon token
            if (App.game.gameState === GameConstants.GameState.town
                && player.town().dungeon
                && App.game.keyItems.hasKeyItem(KeyItemType.Dungeon_ticket)
                && (App.game.wallet.currencies[GameConstants.Currency.dungeonToken]() >= player.town().dungeon.tokenCost))
            {
                // Display the automation menu (if not already visible)
                if (document.getElementById("dungeonFightButtons").hidden || (this.__previousTown != player.town().name))
                {
                    // Reset button status
                    if (localStorage.getItem("dungeonFightEnabled") == "true")
                    {
                        Automation.Menu.__toggleAutomation("dungeonFightEnabled");
                    }
                    this.__previousTown = player.town().name;

                    // Make it visible
                    document.getElementById("dungeonFightButtons").hidden = false;
                }

                if (localStorage.getItem("dungeonFightEnabled") == "true")
                {
                    this.__isCompleted = false;
                    DungeonRunner.initializeDungeon(player.town().dungeon);
                }
            }
            // Else hide the menu, if we're not in the dungeon
            else if (App.game.gameState !== GameConstants.GameState.dungeon)
            {
                document.getElementById("dungeonFightButtons").hidden = true;
                this.__previousTown = null;
                this.__resetSavedStates();
                if (localStorage.getItem("dungeonFightEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("dungeonFightEnabled");
                }
            }
        }

        static __buildMenu()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let dungeonTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                             +     '&nbsp;Dungeon fight&nbsp;'
                             + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let dungeonDiv = Automation.Menu.__addCategory("dungeonFightButtons", dungeonTitle);
            dungeonDiv.hidden = true;

            // Add an on/off button
            Automation.Menu.__addAutomationButton("AutoFight", "dungeonFightEnabled", false, "dungeonFightButtonsDiv", true);
        }

        static __resetSavedStates()
        {
            this.__bossPosition = null;
            this.__chestPositions = [];
            this.__isCompleted = false;
        }
    }

    /**************************/
    /*     GYM AUTOMATION     */
    /**************************/

    static Gym = class AutomationGym
    {
        static __previousTown = null;
        static __currentGymListSize = 0;

        static start()
        {
            this.__buildMenu();

            setInterval(this.__mainLoop.bind(this), 50); // Runs every game tick
        }

        static __mainLoop()
        {
            // We are currently fighting, do do anything
            if (App.game.gameState === GameConstants.GameState.gym)
            {
                return;
            }

            // Check if we are in a town
            if (App.game.gameState === GameConstants.GameState.town)
            {
                // List available gyms
                let gymList = player.town().content.filter(x => GymList[x.town]);
                let unlockedGymCount = gymList.reduce((count, gym) => count + (gym.isUnlocked() ? 1 : 0), 0);

                // If we are in the same town as previous cycle
                if ((this.__previousTown === player.town().name)
                    && (!document.getElementById("gymFightButtons").hidden))
                {
                    if (this.__currentGymListSize !== unlockedGymCount)
                    {
                        this.__updateGymList(gymList, unlockedGymCount, false);
                    }

                    if (localStorage.getItem("gymFightEnabled") == "true")
                    {
                        if (document.getElementById("selectedAutomationGym").selectedIndex < 0)
                        {
                            Automation.Menu.__toggleAutomation("gymFightEnabled");
                            return;
                        }

                        GymList[document.getElementById("selectedAutomationGym").value].protectedOnclick();
                    }
                    return;
                }

                this.__previousTown = player.town().name;

                if (gymList.length > 0)
                {
                    this.__updateGymList(gymList, unlockedGymCount, true);

                    if (localStorage.getItem("gymFightEnabled") == "true")
                    {
                        Automation.Menu.__toggleAutomation("gymFightEnabled");
                    }

                    // Make it visible
                    document.getElementById("gymFightButtons").hidden = false;
                    return;
                }
            }

            // Else hide the menu and disable the button, if needed
            if (!document.getElementById("gymFightButtons").hidden)
            {
                document.getElementById("gymFightButtons").hidden = true;
                this.__previousTown = null;
                if (localStorage.getItem("gymFightEnabled") == "true")
                {
                    Automation.Menu.__toggleAutomation("gymFightEnabled");
                }
            }
        }

        static __updateGymList(gymList, unlockedGymCount, rebuild)
        {
            let selectElem = document.getElementById("selectedAutomationGym");

            if (rebuild)
            {
                // Drop all elements and rebuild the list
                selectElem.innerHTML = "";

                let selectedItemSet = false;
                gymList.forEach(gym =>
                    {
                        let opt = document.createElement("option");
                        opt.value = gym.town;
                        opt.id = gym.town;
                        opt.innerHTML = gym.leaderName;

                        // Don't show the option if it's not been unlocked yet
                        if (!gym.isUnlocked())
                        {
                            opt.style.display = "none";
                        }
                        else if (!selectedItemSet)
                        {
                            opt.selected = true;
                            selectedItemSet = true;
                        }

                        selectElem.options.add(opt);
                    });
            }
            else
            {
                gymList.forEach(gym =>
                    {
                        if (gym.isUnlocked())
                        {
                            let opt = selectElem.options.namedItem(gym.town);
                            if (opt.style.display === "none")
                            {
                                opt.style.display = "block";
                            }
                        }
                    });
            }

            if (unlockedGymCount == 0)
            {
                document.getElementById("selectedAutomationGym").selectedIndex = -1;
            }

            this.__currentGymListSize = unlockedGymCount;
        }

        static __buildMenu()
        {
            // Hide the gym and dungeon fight menus by default and disable auto fight
            let gymTitle = '<img src="assets/images/trainers/Crush Kin.png" height="20px" style="transform: scaleX(-1); position:relative; bottom: 3px;">'
                         +     '&nbsp;Gym fight&nbsp;'
                         + '<img src="assets/images/trainers/Crush Kin.png" style="position:relative; bottom: 3px;" height="20px">';
            let gymDiv = Automation.Menu.__addCategory("gymFightButtons", gymTitle);
            gymDiv.hidden = true;

            // Add an on/off button
            Automation.Menu.__addAutomationButton("AutoFight", "gymFightEnabled", false, "gymFightButtonsDiv", true);

            // Add gym selector drop-down list
            let selectElem = document.createElement("select");
            selectElem.className = "custom-select";
            selectElem.name = "selectedAutomationGym";
            selectElem.id = selectElem.name;
            selectElem.style.width = "calc(100% - 10px)";
            selectElem.style.marginTop = "3px";
            selectElem.style.marginRight = "5px";
            document.getElementById("gymFightButtonsDiv").appendChild(selectElem);
        }
    }

    /**************************/
    /*  HATCHERY  AUTOMATION  */
    /**************************/

    static Hatchery = class AutomationHatchery
    {
        static start()
        {
            // Disable no-shiny mode by default
            if (localStorage.getItem("notShinyFirstHatcheryAutomationEnabled") == null)
            {
                localStorage.setItem("notShinyFirstHatcheryAutomationEnabled", false);
            }

            // Add the related buttons to the automation menu
            Automation.Menu.__addAutomationButton("Hatchery", "hatcheryAutomationEnabled", true);
            Automation.Menu.__addAutomationButton("Not shiny 1st", "notShinyFirstHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Fossil", "fossilHatcheryAutomationEnabled");
            Automation.Menu.__addAutomationButton("Eggs", "eggsHatcheryAutomationEnabled");

            setInterval(this.__mainLoop.bind(this), 1000); // Runs every seconds
        }

        static __mainLoop()
        {
            if (localStorage.getItem("hatcheryAutomationEnabled") == "true")
            {
                // Attempt to hatch each egg. If the egg is at 100% it will succeed
                [3, 2, 1, 0].forEach((index) => App.game.breeding.hatchPokemonEgg(index));

                // Try to use eggs first, if enabled
                if (localStorage.getItem("eggsHatcheryAutomationEnabled") == "true")
                {
                    let tryToHatchEgg = function (type)
                    {
                        // Use an egg only if:
                        //   - a slot is available
                        //   - the player has one
                        //   - a new pokemon can be caught that way
                        //   - the item actually can be used
                        while (App.game.breeding.hasFreeEggSlot()
                               && player.itemList[type.name]()
                               && !type.getCaughtStatus()
                               && type.checkCanUse())
                        {
                            type.use();
                            Automation.__sendNotif("Added a " + type.displayName + " to the Hatchery!");
                        }
                    };

                    tryToHatchEgg(ItemList.Fire_egg);
                    tryToHatchEgg(ItemList.Water_egg);
                    tryToHatchEgg(ItemList.Grass_egg);
                    tryToHatchEgg(ItemList.Fighting_egg);
                    tryToHatchEgg(ItemList.Electric_egg);
                    tryToHatchEgg(ItemList.Dragon_egg);
                    tryToHatchEgg(ItemList.Mystery_egg);
                }

                // Then try to use fossils, if enabled
                if (localStorage.getItem("fossilHatcheryAutomationEnabled") == "true")
                {
                    let tryToHatchFossil = function (type)
                    {
                        let associatedPokemon = GameConstants.FossilToPokemon[type.name];
                        let hasPokemon = App.game.party.caughtPokemon.some((partyPokemon) => (partyPokemon.name === associatedPokemon))

                        // Use an egg only if:
                        //   - a slot is available
                        //   - the player has one
                        //   - the corresponding pokemon is from an unlocked region
                        //   - the pokemon associated to the fossil is not already held by the player
                        //   - the fossil is not already in hatchery
                        if (App.game.breeding.hasFreeEggSlot()
                            && (type.amount() > 0)
                            && PokemonHelper.calcNativeRegion(GameConstants.FossilToPokemon[type.name]) <= player.highestRegion()
                            && !hasPokemon
                            && ![3, 2, 1, 0].some((index) => (App.game.breeding.eggList[index]().pokemon === associatedPokemon)))
                        {
                            // Hatching a fossil is performed by selling it
                            Underground.sellMineItem(type.id);
                            Automation.__sendNotif("Added a " + type.name + " to the Hatchery!");
                        }
                    };

                    let currentlyHeldFossils = Object.keys(GameConstants.FossilToPokemon).map(f => player.mineInventory().find(i => i.name == f)).filter(f => f ? f.amount() : false);
                    let i = 0;
                    while (App.game.breeding.hasFreeEggSlot() && (i < currentlyHeldFossils.length))
                    {
                        tryToHatchFossil(currentlyHeldFossils[i]);
                        i++;
                    }
                }

                // Now add lvl 100 pokemons to empty slots if we can
                if (App.game.breeding.hasFreeEggSlot())
                {
                    // Get breedable pokemon list
                    let filteredEggList = App.game.party.caughtPokemon.filter(
                        (pokemon) =>
                        {
                            // Only consider breedable Pokemon (ie. not breeding and lvl 100)
                            return !pokemon.breeding && (pokemon.level == 100);
                        });

                    let notShinyFirst = (localStorage.getItem("notShinyFirstHatcheryAutomationEnabled") === "true");

                    // Sort list by breeding efficiency
                    filteredEggList.sort((a, b) =>
                        {
                            if (notShinyFirst)
                            {
                                if (a.shiny && !b.shiny)
                                {
                                    return 1;
                                }
                                if (!a.shiny && b.shiny)
                                {
                                    return -1;
                                }
                            }

                            let aValue = ((a.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + a.proteinsUsed()) / pokemonMap[a.name].eggCycles);
                            let bValue = ((b.baseAttack * (GameConstants.BREEDING_ATTACK_BONUS / 100) + b.proteinsUsed()) / pokemonMap[b.name].eggCycles);

                            if (aValue < bValue)
                            {
                                return 1;
                            }
                            if (aValue > bValue)
                            {
                                return -1;
                            }

                            return 0;
                        });

                    // Do not add pokemons to the queue as it reduces the overall attack
                    // (this will also allow the player to add pokemons, eggs or fossils manually)
                    var i = 0;
                    while ((i < filteredEggList.length) && App.game.breeding.hasFreeEggSlot())
                    {
                        App.game.breeding.addPokemonToHatchery(filteredEggList[i]);
                        Automation.__sendNotif("Added " + filteredEggList[i].name + " to the Hatchery!");
                        i++;
                    }
                }
            }
        }
    }

    /**************************/
    /*    FARM  AUTOMATION    */
    /**************************/

    static Farm = class AutomationFarm
    {
        static start()
        {
            // Add the related buttons to the automation menu
            Automation.Menu.__addAutomationButton("Farming", "autoFarmingEnabled", true);
            Automation.Menu.__addAutomationButton("Mutation", "autoMutationFarmingEnabled");

            setInterval(this.__mainLoop.bind(this), 10000); // Every 10 seconds
        }

        static __mainLoop()
        {
            if (localStorage.getItem("autoFarmingEnabled") == "true")
            {
                this.__readyToHarvestCount = 0;
                // Check if any berry is ready to harvest
                App.game.farming.plotList.forEach((plot, index) =>
                {
                    if (plot.berry === BerryType.None || plot.stage() != PlotStage.Berry) return;
                    this.__readyToHarvestCount++;
                }, this);

                if (this.__readyToHarvestCount > 0)
                {
                    App.game.farming.harvestAll();

                    if (localStorage.getItem("autoMutationFarmingEnabled") == "true")
                    {
                        // this.__twoBerriesMutation(BerryType.Sitrus, BerryType.Aspear);
                        // this.__lumBerryFarm();
                        // this.__singleBerryFarm(BerryType.Pecha);
                        this.__fourBerryFarm(BerryType.Mago, BerryType.Magost, BerryType.Nanab, BerryType.Watmel);
                    }
                    else
                    {
                        App.game.farming.plantAll(FarmController.selectedBerry());

                        let berryName = Object.values(BerryType)[FarmController.selectedBerry()];
                        let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

                        Automation.__sendNotif("Harvested " + this.__readyToHarvestCount.toString() + " berries<br>"
                                             + "Planted back some " + berryName + " " + berryImage);
                    }
                }
            }
        }

        static __readyToHarvestCount = 0;

        static __singleBerryFarm(berryType)
        {
            [2, 3, 5, 10, 12, 14, 19, 21, 21].forEach((index) => App.game.farming.plant(index, berryType, true));

            let berryName = Object.values(BerryType)[berryType];
            let berryImage = '<img src="assets/images/items/berry/' + berryName + '.png" height="28px">';

            Automation.__sendNotif("Harvested " + this.__readyToHarvestCount.toString() + " berries<br>"
                                 + "Looking for mutation wih " + berryName + " " + berryImage);
        }

        static __twoBerriesMutation(berry1Type, berry2Type)
        {
            // Hard-coded strategy, this should be adapted based on unlock slots
            let berry1Name = Object.values(BerryType)[berry1Type];
            let berry1Image = '<img src="assets/images/items/berry/' + berry1Name + '.png" height="28px">';
            let berry2Name = Object.values(BerryType)[berry2Type];
            let berry2Image = '<img src="assets/images/items/berry/' + berry2Name + '.png" height="28px">';

            App.game.farming.plant(6, berry1Type, true);
            App.game.farming.plant(12, berry2Type, true);
            App.game.farming.plant(18, berry1Type, true);
            App.game.farming.plant(21, berry1Type, true);

            Automation.__sendNotif("Harvested " + this.__readyToHarvestCount.toString() + " berries<br>"
                                 + "Looking for mutation wih " + berry1Name + " " + berry1Image + " and " + berry2Name + " " + berry2Image);
        }

        static __fourBerryFarm(berryType1, berryType2, berryType3, berryType4)
        {
            [0, 4, 17].forEach((index) => App.game.farming.plant(index, berryType1, true));
            [2, 15, 19].forEach((index) => App.game.farming.plant(index, berryType2, true));
            [5, 9, 22].forEach((index) => App.game.farming.plant(index, berryType3, true));
            [7, 20, 24].forEach((index) => App.game.farming.plant(index, berryType4, true));

            Automation.__sendNotif("Harvested " + this.__readyToHarvestCount.toString() + " berries<br>"
                                 + "Looking for mutation wih four berries");
        }

        static __lumBerryFarm()
        {
            App.game.farming.plant(6, BerryType.Cheri, true);
            App.game.farming.plant(7, BerryType.Chesto, true);
            App.game.farming.plant(8, BerryType.Pecha, true);
            App.game.farming.plant(11, BerryType.Rawst, true);
            App.game.farming.plant(13, BerryType.Aspear, true);
            App.game.farming.plant(16, BerryType.Leppa, true);
            App.game.farming.plant(17, BerryType.Oran, true);
            App.game.farming.plant(18, BerryType.Sitrus, true);

            Automation.__sendNotif("Harvested " + this.__readyToHarvestCount.toString() + " berries. Looking for mutation...");
        }
    }

    /**************************/
    /*    MINE  AUTOMATION    */
    /**************************/

    static Underground = class AutomationUnderground
    {
        static start()
        {
            // Add the related button to the automation menu
            Automation.Menu.__addAutomationButton("Mining", "autoMiningEnabled", true);

            setInterval(function ()
            {
                if (this.__isMiningPossible())
                {
                    this.__startMining();
                }
            }.bind(this), 10000); // Check every 10 seconds
        }

        static __miningCount = 0;

        static __isMiningPossible()
        {
            return ((localStorage.getItem("autoMiningEnabled") === "true")
                    && (Math.floor(App.game.underground.energy) >= Underground.BOMB_ENERGY)
                    && (Mine.itemsFound() < Mine.itemsBuried()));
        }

        static __startMining()
        {
            var bombingLoop = setInterval(function()
            {
                if (this.__isMiningPossible())
                {
                    // Mine using bombs until the board is completed or the energy is depleted
                    Mine.bomb();
                    this.__miningCount++;
                }
                else
                {
                    Automation.__sendNotif("Performed mining " + this.__miningCount.toString() + " times,"
                                         + " energy left: " + Math.floor(App.game.underground.energy).toString() + "!");
                    clearInterval(bombingLoop);
                    this.__miningCount = 0;
                }
            }.bind(this), 500); // Runs every 0.5s
        }
    }
}

// Start the automation
Automation.start();
