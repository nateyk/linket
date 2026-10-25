
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (Schema::hasTable('ai_agent_flows')) {
            return;
        }

        Schema::create('ai_agent_flows', function (Blueprint $table) {
            $table->id();

            $table->string('name');
            $table->integer('activation_count')->default(0);
            $table->string('intent')->nullable()->index();
            $table->longText('config');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_agent_flows');
    }
};

